const { putItem } = require("./dynamo");
const { makeId } = require("./ids");
const { nowIso } = require("./http");

const EVENTS_TABLE = process.env.EVENTS_TABLE || "MootiveDeliveryEvents";

async function writeEvent({ deliveryId, actorId, actorRole, eventType, message, metadata }) {
  const event = {
    eventId: makeId("EVT"),
    deliveryId,
    actorId: actorId || null,
    actorRole: actorRole || null,
    eventType,
    message: message || null,
    metadata: metadata || null,
    createdAt: nowIso(),
  };
  await putItem(EVENTS_TABLE, event);
  return event;
}

module.exports = { writeEvent };
