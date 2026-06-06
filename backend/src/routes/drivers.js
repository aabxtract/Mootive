const { getItem, putItem, query, UpdateCommand, docClient } = require("../lib/dynamo");
const { json, nowIso } = require("../lib/http");
const { makeId } = require("../lib/ids");
const { getCurrentUser, requireRole } = require("../lib/auth");
const { writeEvent } = require("../lib/events");
const { STATUSES, canTransition } = require("../lib/statuses");

const DRIVERS_TABLE = process.env.DRIVERS_TABLE || "MootiveDrivers";
const DELIVERIES_TABLE = process.env.DELIVERIES_TABLE || "MootiveDeliveries";

async function findDriverByUserId(userId) {
  const rows = await query(DRIVERS_TABLE, {
    IndexName: "userId-index",
    KeyConditionExpression: "userId = :u",
    ExpressionAttributeValues: { ":u": userId },
    Limit: 1,
  });
  return rows[0] || null;
}

async function createProfile(event, ctx) {
  const user = await getCurrentUser(event);
  const err = requireRole(user, "driver");
  if (err) return json(err.error.statusCode, { message: err.error.message });

  const existing = await findDriverByUserId(user.userId);
  if (existing) return json(200, { created: false, driver: existing });

  const driver = {
    driverId: makeId("DRV"),
    userId: user.userId,
    name: user.name,
    phoneNumber: user.phoneNumber || null,
    currentArea: ctx.body.currentArea || null,
    currentLat: ctx.body.currentLat != null ? Number(ctx.body.currentLat) : null,
    currentLng: ctx.body.currentLng != null ? Number(ctx.body.currentLng) : null,
    vehicleType: ctx.body.vehicleType || "motorcycle",
    trustScore: 85,
    completionRate: 100,
    averagePickupTime: 12,
    availabilityStatus: "unavailable",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await putItem(DRIVERS_TABLE, driver);
  return json(201, { created: true, driver });
}

async function getMe(event) {
  const user = await getCurrentUser(event);
  const err = requireRole(user, "driver");
  if (err) return json(err.error.statusCode, { message: err.error.message });
  const driver = await findDriverByUserId(user.userId);
  if (!driver) return json(404, { message: "Driver profile not created. POST /drivers/profile first." });
  return json(200, { driver });
}

async function updateAvailability(event, ctx) {
  const user = await getCurrentUser(event);
  const err = requireRole(user, "driver");
  if (err) return json(err.error.statusCode, { message: err.error.message });

  const driver = await findDriverByUserId(user.userId);
  if (!driver) return json(404, { message: "Driver profile not created." });

  const sets = ["updatedAt = :t"];
  const values = { ":t": nowIso() };
  const names = {};

  if (ctx.body.available !== undefined) {
    sets.push("availabilityStatus = :a");
    values[":a"] = ctx.body.available ? "available" : "unavailable";
  }
  if (ctx.body.lat !== undefined) {
    sets.push("currentLat = :lat");
    values[":lat"] = Number(ctx.body.lat);
  }
  if (ctx.body.lng !== undefined) {
    sets.push("currentLng = :lng");
    values[":lng"] = Number(ctx.body.lng);
  }
  if (ctx.body.currentArea !== undefined) {
    sets.push("currentArea = :ar");
    values[":ar"] = ctx.body.currentArea;
  }

  await docClient.send(new UpdateCommand({
    TableName: DRIVERS_TABLE,
    Key: { driverId: driver.driverId },
    UpdateExpression: "SET " + sets.join(", "),
    ExpressionAttributeValues: values,
    ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
  }));

  const updated = await getItem(DRIVERS_TABLE, { driverId: driver.driverId });
  return json(200, { driver: updated });
}

async function openJobs(event) {
  const user = await getCurrentUser(event);
  const err = requireRole(user, "driver");
  if (err) return json(err.error.statusCode, { message: err.error.message });

  const rows = await query(DELIVERIES_TABLE, {
    IndexName: "status-index",
    KeyConditionExpression: "#s = :s",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":s": STATUSES.OPEN_FOR_DRIVERS },
  });
  return json(200, { count: rows.length, deliveries: rows });
}

async function acceptedJobs(event) {
  const user = await getCurrentUser(event);
  const err = requireRole(user, "driver");
  if (err) return json(err.error.statusCode, { message: err.error.message });

  const driver = await findDriverByUserId(user.userId);
  if (!driver) return json(404, { message: "Driver profile not created." });

  const rows = await query(DELIVERIES_TABLE, {
    IndexName: "assignedDriverId-index",
    KeyConditionExpression: "assignedDriverId = :d",
    ExpressionAttributeValues: { ":d": driver.driverId },
  });
  return json(200, { count: rows.length, deliveries: rows });
}

async function acceptJob(event, ctx) {
  const user = await getCurrentUser(event);
  const err = requireRole(user, "driver");
  if (err) return json(err.error.statusCode, { message: err.error.message });

  const driver = await findDriverByUserId(user.userId);
  if (!driver) return json(404, { message: "Driver profile not created." });

  const deliveryId = ctx.params.deliveryId;
  const next = STATUSES.DRIVER_ACCEPTED;

  try {
    const res = await docClient.send(new UpdateCommand({
      TableName: DELIVERIES_TABLE,
      Key: { deliveryId },
      UpdateExpression: "SET #s = :next, assignedDriverId = :d, updatedAt = :t",
      ConditionExpression: "#s = :open AND attribute_not_exists(assignedDriverId)",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":next": next,
        ":open": STATUSES.OPEN_FOR_DRIVERS,
        ":d": driver.driverId,
        ":t": nowIso(),
      },
      ReturnValues: "ALL_NEW",
    }));

    await writeEvent({
      deliveryId,
      actorId: driver.driverId,
      actorRole: "driver",
      eventType: "DRIVER_ACCEPTED",
      message: `Driver ${driver.name} accepted the delivery.`,
    });

    return json(200, { delivery: res.Attributes, driverId: driver.driverId });
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") {
      return json(409, { message: "This delivery has already been accepted by another driver." });
    }
    throw e;
  }
}

module.exports = { createProfile, getMe, updateAvailability, openJobs, acceptedJobs, acceptJob, findDriverByUserId };
