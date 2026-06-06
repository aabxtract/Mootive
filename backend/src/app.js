const {
  BatchWriteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  docClient,
} = require("./lib/dynamo");
const { makeId } = require("./lib/ids");
const { json, noContent, parseBody } = require("./lib/http");
const { users: seedUsers, riders: seedRiders } = require("./data/seed");
const { recommend } = require("./utils/recommendation");

const USERS_TABLE = process.env.USERS_TABLE || "MootiveUsers";
const DELIVERIES_TABLE = process.env.DELIVERIES_TABLE || "MootiveDeliveries";
const RIDERS_TABLE = process.env.RIDERS_TABLE || "MootiveRiders";
const TICKETS_TABLE = process.env.TICKETS_TABLE || "MootiveTickets";

let usersSeeded = false;
let ridersSeeded = false;

function now() {
  return new Date().toISOString();
}

function normalizeReceiverTag(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed.toLowerCase() : `@${trimmed.toLowerCase()}`;
}

async function tableHasItems(tableName, keyName) {
  const response = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      ProjectionExpression: keyName,
      Limit: 1,
    })
  );

  return Array.isArray(response.Items) && response.Items.length > 0;
}

async function batchSeed(tableName, items) {
  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [tableName]: items.map((item) => ({
          PutRequest: { Item: item },
        })),
      },
    })
  );
}

async function ensureSeedData() {
  if (!usersSeeded) {
    const hasUsers = await tableHasItems(USERS_TABLE, "userId");
    if (!hasUsers) {
      await batchSeed(
        USERS_TABLE,
        seedUsers.map((user) => ({
          userId: user.id,
          name: user.name,
          phoneNumber: user.phone,
          username: user.username,
          receiverTag: normalizeReceiverTag(user.receiverTag || user.username),
          role: user.role || "both",
          createdAt: now(),
          updatedAt: now(),
        }))
      );
    }
    usersSeeded = true;
  }

  if (!ridersSeeded) {
    const hasRiders = await tableHasItems(RIDERS_TABLE, "riderId");
    if (!hasRiders) {
      await batchSeed(
        RIDERS_TABLE,
        seedRiders.map((rider) => ({
          riderId: rider.id,
          name: rider.name,
          location: rider.location,
          distanceKm: rider.distanceKm,
          pickupMins: rider.pickupMins,
          estimatedPrice: rider.estimatedPrice,
          trustScore: rider.trustScore,
          available: rider.available !== false,
          availabilityStatus: rider.available === false ? "unavailable" : "available",
          createdAt: now(),
          updatedAt: now(),
        }))
      );
    }
    ridersSeeded = true;
  }
}

async function scanAll(tableName) {
  const response = await docClient.send(new ScanCommand({ TableName: tableName }));
  return response.Items || [];
}

async function getItem(tableName, key) {
  const response = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: key,
    })
  );

  return response.Item || null;
}

async function putItem(tableName, item) {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );
  return item;
}

async function findUser(identifier) {
  if (!identifier) return null;

  const users = await scanAll(USERS_TABLE);
  const needle = String(identifier).trim().toLowerCase();
  const bare = needle.replace(/^@/, "");

  return (
    users.find(
      (user) =>
        user.userId === identifier ||
        (user.receiverTag && user.receiverTag.toLowerCase() === normalizeReceiverTag(needle)) ||
        (user.username && user.username.toLowerCase() === bare) ||
        (user.phoneNumber && user.phoneNumber === bare)
    ) || null
  );
}

async function findTicketByDeliveryId(deliveryId) {
  const tickets = await scanAll(TICKETS_TABLE);
  return tickets.find((ticket) => ticket.deliveryId === deliveryId) || null;
}

function withStatus(delivery, nextStatus) {
  return {
    ...delivery,
    deliveryStatus: nextStatus,
    status: nextStatus,
    updatedAt: now(),
    statusHistory: [
      ...(Array.isArray(delivery.statusHistory) ? delivery.statusHistory : []),
      { status: nextStatus, at: now() },
    ],
  };
}

function ensurePayment(delivery) {
  if (delivery.totalDeliveryFee != null) return delivery;
  const totalDeliveryFee = Number(delivery.selectedRider?.estimatedPrice) || 0;
  return {
    ...delivery,
    totalDeliveryFee,
    releasedToRider: 0,
    lockedAmount: totalDeliveryFee,
    paymentStatus: "Simulated - Awaiting Pickup",
  };
}

function buildSummary(delivery) {
  const total = Number(delivery.totalDeliveryFee || 0);
  const pickupRelease = Math.round(total * 0.6);
  const confirmRelease = total - pickupRelease;

  return {
    deliveryId: delivery.deliveryId,
    packageType: delivery.packageType,
    rider: delivery.selectedRider?.name || "Unknown rider",
    receiverName: delivery.receiverName || delivery.receiverTag || "Unknown receiver",
    status: delivery.deliveryStatus,
    totalDeliveryFee: total,
    payoutReleasedAfterPickup: pickupRelease,
    payoutReleasedAfterConfirmation: confirmRelease,
    message:
      "Delivery completed - your package was confirmed by the receiver. Rider payout has been fully released.",
  };
}

function toRecommendationRider(rider) {
  return {
    id: rider.riderId,
    name: rider.name,
    location: rider.location,
    distanceKm: Number(rider.distanceKm) || 0,
    pickupMins: Number(rider.pickupMins) || 0,
    estimatedPrice: Number(rider.estimatedPrice) || 0,
    trustScore: Number(rider.trustScore) || 0,
    available: rider.available !== false,
  };
}

function normalizeRecommendationResult(result) {
  return {
    riders: result.riders.map((rider) => ({
      ...rider,
      riderId: rider.id,
    })),
    recommendation: {
      ...result.recommendation,
      riderId: result.recommendation.riderId,
    },
    intelligence: result.intelligence,
  };
}

exports.handler = async (event) => {
  try {
    await ensureSeedData();

    const method =
      event.requestContext?.http?.method || event.httpMethod || "GET";
    const rawPath = event.rawPath || event.path || "/";
    const path = rawPath.replace(/\/+$/, "") || "/";
    const body = parseBody(event);

    if (method === "OPTIONS") {
      return noContent();
    }

    if (method === "GET" && path === "/health") {
      return json(200, {
        status: "ok",
        service: "mootive-aws-backend",
        time: now(),
      });
    }

    if (method === "POST" && path === "/users") {
      const name = body.name || "Guest";
      const phoneNumber = body.phoneNumber || body.phone || "";
      const username = body.username || (name ? name.split(" ")[0].toLowerCase() : "");

      if (!name && !phoneNumber && !username) {
        return json(400, {
          message: "Provide at least a name, phone number, or username.",
        });
      }

      const existing =
        (username && (await findUser(username))) ||
        (phoneNumber && (await findUser(phoneNumber)));

      if (existing) {
        return json(200, {
          message: "User signed in.",
          created: false,
          userId: existing.userId,
          user: existing,
        });
      }

      const user = {
        userId: makeId("USR"),
        name,
        phoneNumber,
        username: username || makeId("user").toLowerCase(),
        receiverTag: normalizeReceiverTag(username || name.split(" ")[0] || "user"),
        role: "both",
        createdAt: now(),
        updatedAt: now(),
      };

      await putItem(USERS_TABLE, user);

      return json(201, {
        message: "User created and signed in.",
        created: true,
        userId: user.userId,
        user,
      });
    }

    if (method === "GET" && path === "/users") {
      return json(200, { users: await scanAll(USERS_TABLE) });
    }

    const incomingMatch = path.match(/^\/users\/([^/]+)\/incoming$/);
    if (method === "GET" && incomingMatch) {
      const tag = decodeURIComponent(incomingMatch[1]);
      const user = await findUser(tag);
      const normalizedTag = normalizeReceiverTag(tag);
      const deliveries = await scanAll(DELIVERIES_TABLE);
      const incoming = deliveries.filter(
        (delivery) =>
          (user && delivery.receiverId === user.userId) ||
          normalizeReceiverTag(delivery.receiverTag) === normalizedTag
      );

      return json(200, { count: incoming.length, deliveries: incoming });
    }

    const userMatch = path.match(/^\/users\/([^/]+)$/);
    if (method === "GET" && userMatch) {
      const user = await findUser(decodeURIComponent(userMatch[1]));
      if (!user) return json(404, { found: false, message: "Receiver not found" });
      return json(200, { found: true, user });
    }

    if (method === "POST" && path === "/deliveries") {
      const senderId = body.senderId || body.userId || null;
      const sender = senderId ? await findUser(senderId) : null;
      const pickupLocation = body.pickupLocation || body.pickup || "";
      const dropoffLocation = body.dropoffLocation || body.dropoff || "";
      const receiverTag = normalizeReceiverTag(body.receiverTag || "");

      if (!pickupLocation || !dropoffLocation || !receiverTag) {
        return json(400, {
          message: "pickupLocation, dropoffLocation, and receiverTag are required.",
        });
      }

      const receiver = await findUser(receiverTag);
      const deliveryId = makeId("DLV");
      const delivery = {
        deliveryId,
        senderId: sender?.userId || senderId,
        senderName: sender?.name || body.senderName || "Unknown sender",
        pickupLocation,
        dropoffLocation,
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        receiverTag,
        receiverId: receiver?.userId || null,
        receiverName: receiver?.name || body.receiverName || null,
        receiverPhone: receiver?.phoneNumber || body.receiverPhone || null,
        receiverFound: Boolean(receiver),
        confirmationLink: receiver ? null : `https://mootive.app/confirm/${deliveryId}`,
        packageType: body.packageType || "Parcel",
        packageValue: Number(body.packageValue) || 0,
        urgency: body.urgency || "normal",
        deliveryNote: body.deliveryNote || body.note || "",
        deliveryStatus: "Created",
        status: "Created",
        statusHistory: [{ status: "Created", at: now() }],
        createdAt: now(),
        updatedAt: now(),
      };

      await putItem(DELIVERIES_TABLE, delivery);

      return json(201, {
        message: "Delivery created.",
        delivery,
        receiver: receiver
          ? {
              found: true,
              message: `Receiver ${receiver.name} found. They will see this as an incoming delivery.`,
            }
          : {
              found: false,
              message: "Receiver not found. A confirmation link was generated.",
              confirmationLink: delivery.confirmationLink,
            },
      });
    }

    if (method === "GET" && path === "/deliveries") {
      return json(200, { deliveries: await scanAll(DELIVERIES_TABLE) });
    }

    const deliveryMatch = path.match(/^\/deliveries\/([^/]+)$/);
    if (method === "GET" && deliveryMatch) {
      const delivery = await getItem(DELIVERIES_TABLE, {
        deliveryId: decodeURIComponent(deliveryMatch[1]),
      });
      if (!delivery) return json(404, { message: "Delivery not found" });
      return json(200, { delivery });
    }

    if (method === "GET" && path === "/riders") {
      return json(200, { riders: await scanAll(RIDERS_TABLE) });
    }

    if (method === "POST" && path === "/riders/find") {
      const deliveryId = body.deliveryId;
      if (!deliveryId) return json(400, { message: "deliveryId is required." });

      const delivery = await getItem(DELIVERIES_TABLE, { deliveryId });
      if (!delivery) return json(404, { message: "Delivery not found" });

      const riders = (await scanAll(RIDERS_TABLE)).filter((rider) => rider.available !== false);
      return json(200, {
        message: "Nearby riders found.",
        deliveryId,
        riders,
      });
    }

    if (method === "POST" && path === "/recommend-rider") {
      const deliveryId = body.deliveryId;
      if (!deliveryId) return json(400, { message: "deliveryId is required." });

      const delivery = await getItem(DELIVERIES_TABLE, { deliveryId });
      if (!delivery) return json(404, { message: "Delivery not found" });

      const allowedIds =
        Array.isArray(body.riderIds) && body.riderIds.length ? body.riderIds : null;

      const riders = (await scanAll(RIDERS_TABLE))
        .filter((rider) => rider.available !== false)
        .filter((rider) => !allowedIds || allowedIds.includes(rider.riderId))
        .map(toRecommendationRider);

      if (!riders.length) {
        return json(404, { message: "No riders available for recommendation." });
      }

      const recommendationResult = normalizeRecommendationResult(
        recommend(riders, {
          pickup: delivery.pickupLocation,
          dropoff: delivery.dropoffLocation,
          packageValue: delivery.packageValue,
          urgency: delivery.urgency,
        })
      );

      const updatedDelivery = {
        ...delivery,
        recommendedRider: recommendationResult.recommendation,
        fairPriceEstimate: recommendationResult.intelligence.fairPriceRange,
        deliveryRisk: recommendationResult.intelligence.deliveryRisk,
        estimatedDeliveryMins: recommendationResult.intelligence.estimatedDeliveryMins,
        routeNote: recommendationResult.intelligence.routeNote,
        updatedAt: now(),
      };

      await putItem(DELIVERIES_TABLE, updatedDelivery);

      return json(200, {
        deliveryId,
        ...recommendationResult,
        ai: {
          mode: "rule-based",
          bedrockExplanationReady: false,
          note: "Bedrock can be layered on later for human-readable explanations.",
        },
      });
    }

    const selectMatch = path.match(/^\/deliveries\/([^/]+)\/select-rider$/);
    if (method === "POST" && selectMatch) {
      const deliveryId = decodeURIComponent(selectMatch[1]);
      const delivery = await getItem(DELIVERIES_TABLE, { deliveryId });
      if (!delivery) return json(404, { message: "Delivery not found" });

      const rider = await getItem(RIDERS_TABLE, { riderId: body.riderId });
      if (!rider) return json(404, { message: "Rider not found" });

      const updatedDelivery = withStatus(
        {
          ...delivery,
          selectedRiderId: rider.riderId,
          selectedRider: rider,
          totalDeliveryFee: Number(rider.estimatedPrice) || 0,
        },
        "Accepted"
      );

      await putItem(DELIVERIES_TABLE, updatedDelivery);

      return json(200, {
        deliveryId,
        selectedRider: rider,
        delivery: updatedDelivery,
      });
    }

    const paymentMatch = path.match(/^\/deliveries\/([^/]+)\/simulate-payment$/);
    if (method === "POST" && paymentMatch) {
      const deliveryId = decodeURIComponent(paymentMatch[1]);
      const delivery = await getItem(DELIVERIES_TABLE, { deliveryId });
      if (!delivery) return json(404, { message: "Delivery not found" });
      if (!delivery.selectedRider) {
        return json(400, { message: "Select a rider before simulating payment." });
      }

      const updatedDelivery = {
        ...ensurePayment(delivery),
        updatedAt: now(),
      };

      await putItem(DELIVERIES_TABLE, updatedDelivery);

      return json(200, {
        deliveryId,
        delivery: updatedDelivery,
        payment: {
          totalDeliveryFee: updatedDelivery.totalDeliveryFee,
          riderPayoutAfterPickup: Math.round(updatedDelivery.totalDeliveryFee * 0.6),
          lockedUntilReceiverConfirms:
            updatedDelivery.totalDeliveryFee - Math.round(updatedDelivery.totalDeliveryFee * 0.6),
          releasedToRider: updatedDelivery.releasedToRider || 0,
          lockedAmount: updatedDelivery.lockedAmount || updatedDelivery.totalDeliveryFee,
        },
      });
    }

    const statusMatch = path.match(/^\/deliveries\/([^/]+)\/status$/);
    if ((method === "POST" || method === "PATCH") && statusMatch) {
      const deliveryId = decodeURIComponent(statusMatch[1]);
      const delivery = await getItem(DELIVERIES_TABLE, { deliveryId });
      if (!delivery) return json(404, { message: "Delivery not found" });
      if (!delivery.selectedRider) {
        return json(400, { message: "Select a rider before updating status." });
      }

      const nextStatus = body.status || body.deliveryStatus;
      const validStatuses = [
        "Created",
        "Accepted",
        "Picked Up",
        "In Transit",
        "Delivered",
        "Confirmed",
        "Completed",
      ];

      if (!validStatuses.includes(nextStatus)) {
        return json(400, { message: "Invalid status.", validStatuses });
      }

      let updatedDelivery = withStatus(ensurePayment(delivery), nextStatus);
      const total = Number(updatedDelivery.totalDeliveryFee || 0);
      const pickupRelease = Math.round(total * 0.6);

      if (nextStatus === "Picked Up") {
        updatedDelivery = {
          ...updatedDelivery,
          releasedToRider: pickupRelease,
          lockedAmount: total - pickupRelease,
          paymentStatus: "60% released after pickup",
        };
      }

      await putItem(DELIVERIES_TABLE, updatedDelivery);

      return json(200, {
        deliveryId,
        deliveryStatus: updatedDelivery.deliveryStatus,
        releasedToRider: updatedDelivery.releasedToRider || 0,
        lockedAmount: updatedDelivery.lockedAmount ?? total,
        paymentStatus: updatedDelivery.paymentStatus || "Pending",
        delivery: updatedDelivery,
      });
    }

    const confirmMatch = path.match(/^\/deliveries\/([^/]+)\/confirm$/);
    if (method === "POST" && confirmMatch) {
      const deliveryId = decodeURIComponent(confirmMatch[1]);
      const delivery = await getItem(DELIVERIES_TABLE, { deliveryId });
      if (!delivery) return json(404, { message: "Delivery not found" });
      if (delivery.deliveryStatus !== "Delivered") {
        return json(409, {
          message: `Delivery must be in Delivered status to confirm. Current: ${delivery.deliveryStatus || "Unknown"}.`,
        });
      }

      const total = Number(delivery.totalDeliveryFee || 0);
      const completedDelivery = {
        ...withStatus(ensurePayment(delivery), "Completed"),
        releasedToRider: total,
        lockedAmount: 0,
        paymentStatus: "Completed - Full payout released",
      };

      completedDelivery.statusHistory.splice(
        completedDelivery.statusHistory.length - 1,
        0,
        { status: "Confirmed", at: now() }
      );

      await putItem(DELIVERIES_TABLE, completedDelivery);

      return json(200, {
        message: "Receiver confirmed delivery. Remaining 40% payout released.",
        delivery: completedDelivery,
        summary: buildSummary(completedDelivery),
      });
    }

    const ticketMatch = path.match(/^\/deliveries\/([^/]+)\/tickets$/);
    if (method === "POST" && ticketMatch) {
      const deliveryId = decodeURIComponent(ticketMatch[1]);
      const delivery = await getItem(DELIVERIES_TABLE, { deliveryId });
      if (!delivery) return json(404, { message: "Delivery not found" });

      const ticket = {
        ticketId: makeId("TCK"),
        deliveryId,
        riderName: delivery.selectedRider?.name || null,
        receiverName: delivery.receiverName || null,
        deliveryStatus: delivery.deliveryStatus,
        reason: body.reason || "Receiver has not confirmed delivery.",
        routeRecord: `${delivery.pickupLocation} -> ${delivery.dropoffLocation}`,
        ticketStatus: "Under Review",
        createdAt: now(),
        updatedAt: now(),
      };

      await putItem(TICKETS_TABLE, ticket);
      return json(201, ticket);
    }

    if (method === "GET" && ticketMatch) {
      const deliveryId = decodeURIComponent(ticketMatch[1]);
      const ticket = await findTicketByDeliveryId(deliveryId);
      if (!ticket) return json(404, { message: "No ticket found for this delivery." });
      return json(200, { ticket });
    }

    return json(404, { message: "Route not found", method, path });
  } catch (error) {
    console.error("Unhandled Lambda error", error);
    return json(500, {
      message: "Internal server error",
      error: error.message,
    });
  }
};
