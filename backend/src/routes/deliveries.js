const { getItem, putItem, query, UpdateCommand, docClient } = require("../lib/dynamo");
const { json, nowIso } = require("../lib/http");
const { makeId } = require("../lib/ids");
const { getCurrentUser, requireAuth, requireRole } = require("../lib/auth");
const { writeEvent } = require("../lib/events");
const { STATUSES, canTransition } = require("../lib/statuses");
const { findByUsername, findByPhone } = require("./users");
const aiRoutes = require("./ai");

const DELIVERIES_TABLE = process.env.DELIVERIES_TABLE || "MootiveDeliveries";
const EVENTS_TABLE = process.env.EVENTS_TABLE || "MootiveDeliveryEvents";

function normalizeTag(v) {
  return String(v || "").trim().toLowerCase().replace(/^@/, "");
}

function genConfirmToken() {
  return `CONFIRM-${makeId("T").split("-").slice(-1)[0]}`;
}

async function create(event, ctx) {
  const user = await getCurrentUser(event);
  const err = requireRole(user, "seller_receiver");
  if (err) return json(err.error.statusCode, { message: err.error.message });

  const b = ctx.body;
  const required = ["pickupAddress", "dropoffAddress", "pickupLat", "pickupLng", "dropoffLat", "dropoffLng"];
  for (const k of required) {
    if (b[k] === undefined || b[k] === null || b[k] === "") {
      return json(400, { message: `${k} is required.` });
    }
  }
  if (!b.receiverTag && !b.receiverPhone) {
    return json(400, { message: "receiverTag or receiverPhone is required." });
  }

  const tag = b.receiverTag ? normalizeTag(b.receiverTag) : null;
  const phone = b.receiverPhone || null;
  const receiver = (tag && (await findByUsername(tag))) || (phone && (await findByPhone(phone))) || null;

  const deliveryId = makeId("DLV");
  const confirmationToken = receiver ? null : genConfirmToken();
  const confirmationLink = receiver ? null : `https://mootive.app/confirm/${deliveryId}?t=${confirmationToken}`;

  const delivery = {
    deliveryId,
    senderId: user.userId,
    receiverId: receiver?.userId,
    receiverTag: tag,
    receiverName: receiver?.name || b.receiverName || null,
    receiverPhone: receiver?.phoneNumber || phone || null,
    confirmationToken,
    confirmationLink,
    smsStatus: receiver ? null : "SIMULATED_SENT",
    pickupAddress: b.pickupAddress,
    pickupArea: b.pickupArea || null,
    pickupLat: Number(b.pickupLat),
    pickupLng: Number(b.pickupLng),
    dropoffAddress: b.dropoffAddress,
    dropoffArea: b.dropoffArea || null,
    dropoffLat: Number(b.dropoffLat),
    dropoffLng: Number(b.dropoffLng),
    packageType: b.packageType || "Parcel",
    packageValue: Number(b.packageValue) || 0,
    urgency: b.urgency || "normal",
    deliveryNote: b.deliveryNote || null,
    status: STATUSES.CREATED,
    assignedDriverId: undefined,
    recommendedDriverId: null,
    fairPriceMin: null,
    fairPriceMax: null,
    riskScore: null,
    riskReasons: null,
    aiRecommendation: null,
    routeId: null,
    estimatedDistance: null,
    estimatedDuration: null,
    routeSummary: null,
    totalDeliveryFee: null,
    paymentStatus: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await putItem(DELIVERIES_TABLE, delivery);
  await writeEvent({
    deliveryId, actorId: user.userId, actorRole: "seller_receiver",
    eventType: "CREATED", message: "Delivery created.",
  });

  // Auto-chain: analyze + open-for-drivers
  let analyzed = delivery;
  try {
    analyzed = await aiRoutes.runAnalyze(delivery, user);
  } catch (e) {
    console.error("Analyze step failed (continuing):", e.message);
  }

  return json(201, {
    delivery: analyzed,
    receiver: receiver
      ? { found: true, message: `Receiver ${receiver.name} found.` }
      : { found: false, message: "Receiver not registered. SMS confirmation link generated.", confirmationLink, confirmationToken },
  });
}

async function get(event, ctx) {
  const d = await getItem(DELIVERIES_TABLE, { deliveryId: ctx.params.deliveryId });
  if (!d) return json(404, { message: "Delivery not found." });
  return json(200, { delivery: d });
}

async function sent(event) {
  const user = await getCurrentUser(event);
  const err = requireAuth(user);
  if (err) return json(err.error.statusCode, { message: err.error.message });
  const rows = await query(DELIVERIES_TABLE, {
    IndexName: "senderId-index",
    KeyConditionExpression: "senderId = :s",
    ExpressionAttributeValues: { ":s": user.userId },
  });
  return json(200, { count: rows.length, deliveries: rows });
}

async function incoming(event) {
  const user = await getCurrentUser(event);
  const err = requireAuth(user);
  if (err) return json(err.error.statusCode, { message: err.error.message });
  const rows = await query(DELIVERIES_TABLE, {
    IndexName: "receiverId-index",
    KeyConditionExpression: "receiverId = :r",
    ExpressionAttributeValues: { ":r": user.userId },
  });
  return json(200, { count: rows.length, deliveries: rows });
}

async function updateStatus(event, ctx) {
  const user = await getCurrentUser(event);
  const err = requireAuth(user);
  if (err) return json(err.error.statusCode, { message: err.error.message });

  const deliveryId = ctx.params.deliveryId;
  const next = ctx.body.status;
  if (!STATUSES[next]) return json(400, { message: "Invalid status.", valid: Object.keys(STATUSES) });

  const d = await getItem(DELIVERIES_TABLE, { deliveryId });
  if (!d) return json(404, { message: "Delivery not found." });

  if (!canTransition(d.status, next)) {
    return json(409, { message: `Cannot transition ${d.status} -> ${next}.` });
  }

  await docClient.send(new UpdateCommand({
    TableName: DELIVERIES_TABLE,
    Key: { deliveryId },
    UpdateExpression: "SET #s = :n, updatedAt = :t",
    ConditionExpression: "#s = :cur",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":n": next, ":cur": d.status, ":t": nowIso() },
  }));

  await writeEvent({
    deliveryId, actorId: user.userId, actorRole: user.role,
    eventType: next, message: `Status changed to ${next}.`,
  });

  const updated = await getItem(DELIVERIES_TABLE, { deliveryId });
  return json(200, { delivery: updated });
}

async function events(event, ctx) {
  const rows = await query(EVENTS_TABLE, {
    IndexName: "deliveryId-createdAt-index",
    KeyConditionExpression: "deliveryId = :d",
    ExpressionAttributeValues: { ":d": ctx.params.deliveryId },
    ScanIndexForward: true,
  });
  return json(200, { count: rows.length, events: rows });
}

async function confirm(event, ctx) {
  const deliveryId = ctx.params.deliveryId;
  const d = await getItem(DELIVERIES_TABLE, { deliveryId });
  if (!d) return json(404, { message: "Delivery not found." });

  // Two auth paths: token OR authenticated receiver
  const user = await getCurrentUser(event);
  const tokenOk = ctx.body.confirmationToken && d.confirmationToken && ctx.body.confirmationToken === d.confirmationToken;
  const userOk = user && d.receiverId && user.userId === d.receiverId;
  if (!tokenOk && !userOk) {
    return json(401, { message: "Provide confirmationToken or sign in as the receiver." });
  }

  if (d.status !== STATUSES.DELIVERED) {
    return json(409, { message: `Delivery must be DELIVERED to confirm. Current: ${d.status}.` });
  }

  // DELIVERED -> CONFIRMED -> COMPLETED
  await docClient.send(new UpdateCommand({
    TableName: DELIVERIES_TABLE,
    Key: { deliveryId },
    UpdateExpression: "SET #s = :c, updatedAt = :t",
    ConditionExpression: "#s = :cur",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":c": STATUSES.CONFIRMED, ":cur": STATUSES.DELIVERED, ":t": nowIso() },
  }));
  await writeEvent({
    deliveryId, actorId: user?.userId || null, actorRole: user?.role || "receiver_token",
    eventType: "CONFIRMED", message: "Receiver confirmed delivery.",
  });

  await docClient.send(new UpdateCommand({
    TableName: DELIVERIES_TABLE,
    Key: { deliveryId },
    UpdateExpression: "SET #s = :c, updatedAt = :t",
    ConditionExpression: "#s = :cur",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":c": STATUSES.COMPLETED, ":cur": STATUSES.CONFIRMED, ":t": nowIso() },
  }));
  await writeEvent({
    deliveryId, actorId: user?.userId || null, actorRole: user?.role || "receiver_token",
    eventType: "COMPLETED", message: "Delivery completed.",
  });

  const updated = await getItem(DELIVERIES_TABLE, { deliveryId });
  return json(200, { delivery: updated });
}

async function reportIssue(event, ctx) {
  const user = await getCurrentUser(event);
  const err = requireAuth(user);
  if (err) return json(err.error.statusCode, { message: err.error.message });

  const deliveryId = ctx.params.deliveryId;
  const d = await getItem(DELIVERIES_TABLE, { deliveryId });
  if (!d) return json(404, { message: "Delivery not found." });

  if (![d.senderId, d.receiverId, d.assignedDriverId].includes(user.userId)) {
    // assignedDriverId is a driverId not userId — also check via driver lookup
    const drivers = require("./drivers");
    const driver = await drivers.findDriverByUserId(user.userId);
    if (!driver || driver.driverId !== d.assignedDriverId) {
      return json(403, { message: "Only participants of this delivery can report an issue." });
    }
  }

  if (!canTransition(d.status, STATUSES.ISSUE_REPORTED)) {
    return json(409, { message: `Cannot report issue from status ${d.status}.` });
  }

  await docClient.send(new UpdateCommand({
    TableName: DELIVERIES_TABLE,
    Key: { deliveryId },
    UpdateExpression: "SET #s = :i, updatedAt = :t",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":i": STATUSES.ISSUE_REPORTED, ":t": nowIso() },
  }));

  await writeEvent({
    deliveryId, actorId: user.userId, actorRole: user.role,
    eventType: "ISSUE_REPORTED",
    message: ctx.body.reason || "Issue reported.",
    metadata: { reason: ctx.body.reason || null, category: ctx.body.category || null },
  });

  const updated = await getItem(DELIVERIES_TABLE, { deliveryId });
  return json(200, { delivery: updated });
}

module.exports = { create, get, sent, incoming, updateStatus, events, confirm, reportIssue };
