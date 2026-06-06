const { LocationClient, CalculateRouteCommand } = require("@aws-sdk/client-location");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { getItem, putItem, UpdateCommand, docClient } = require("../lib/dynamo");
const { json, nowIso } = require("../lib/http");
const { makeId } = require("../lib/ids");
const { getCurrentUser, requireAuth } = require("../lib/auth");
const { writeEvent } = require("../lib/events");
const { STATUSES, canTransition } = require("../lib/statuses");
const drivers = require("./drivers");

const DELIVERIES_TABLE = process.env.DELIVERIES_TABLE || "MootiveDeliveries";
const ROUTES_TABLE = process.env.ROUTES_TABLE || "MootiveRoutes";
const CALCULATOR = process.env.LOCATION_ROUTE_CALCULATOR;
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || "anthropic.claude-haiku-4-5-20251001-v1:0";

const location = new LocationClient({});
const bedrock = new BedrockRuntimeClient({});

async function explainRoute({ delivery, distanceKm, durationMin }) {
  const cmd = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: [{ type: "text", text:
          `Lagos motorcycle dispatch route: ${delivery.pickupAddress} -> ${delivery.dropoffAddress}, ${distanceKm.toFixed(1)} km, ~${durationMin} min. ` +
          `Package: ${delivery.packageType}, urgency ${delivery.urgency}. ` +
          `Return JSON {"summary":"one-sentence rider note","risk":"LOW|MEDIUM|HIGH","reason":"short reason"}`
        }],
      }],
    }),
  });
  try {
    const res = await bedrock.send(cmd);
    const payload = JSON.parse(new TextDecoder().decode(res.body));
    const text = payload.content?.[0]?.text || "{}";
    const m = text.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : text);
  } catch (e) {
    console.error("Bedrock route explain failed:", e.message);
    return { summary: `Direct route ${delivery.pickupArea || ""} -> ${delivery.dropoffArea || ""}.`, risk: "MEDIUM", reason: "Default estimate." };
  }
}

async function optimize(event, ctx) {
  const user = await getCurrentUser(event);
  const err = requireAuth(user);
  if (err) return json(err.error.statusCode, { message: err.error.message });

  const deliveryId = ctx.params.deliveryId;
  const d = await getItem(DELIVERIES_TABLE, { deliveryId });
  if (!d) return json(404, { message: "Delivery not found." });

  // Authorize: sender or assigned driver
  let allowed = d.senderId === user.userId;
  if (!allowed && d.assignedDriverId) {
    const driver = await drivers.findDriverByUserId(user.userId);
    allowed = driver && driver.driverId === d.assignedDriverId;
  }
  if (!allowed) return json(403, { message: "Only the sender or assigned driver can optimize the route." });

  if (!d.assignedDriverId) return json(409, { message: "Driver must accept the job first." });

  let distanceKm, durationMin, geometry = null;
  try {
    const res = await location.send(new CalculateRouteCommand({
      CalculatorName: CALCULATOR,
      DeparturePosition: [d.pickupLng, d.pickupLat],
      DestinationPosition: [d.dropoffLng, d.dropoffLat],
      TravelMode: "Car",
      IncludeLegGeometry: true,
    }));
    distanceKm = res.Summary?.Distance || 0;
    durationMin = Math.round((res.Summary?.DurationSeconds || 0) / 60);
    geometry = res.Legs?.[0]?.Geometry || null;
  } catch (e) {
    console.error("Location Service failed, using estimate:", e.message);
    const ai = require("./ai");
    distanceKm = ai.haversineKm(d.pickupLat, d.pickupLng, d.dropoffLat, d.dropoffLng);
    durationMin = Math.round(distanceKm * 3.5);
  }

  const explain = await explainRoute({ delivery: d, distanceKm, durationMin });

  const route = {
    routeId: makeId("RTE"),
    deliveryId,
    driverId: d.assignedDriverId,
    pickupLat: d.pickupLat,
    pickupLng: d.pickupLng,
    dropoffLat: d.dropoffLat,
    dropoffLng: d.dropoffLng,
    distance: Number(distanceKm.toFixed(2)),
    duration: durationMin,
    routeSummary: explain.summary,
    routeGeometry: geometry,
    routeRisk: explain.risk,
    aiRouteExplanation: explain.reason,
    createdAt: nowIso(),
  };
  await putItem(ROUTES_TABLE, route);

  // DRIVER_ACCEPTED -> ROUTE_OPTIMIZED
  if (canTransition(d.status, STATUSES.ROUTE_OPTIMIZED)) {
    await docClient.send(new UpdateCommand({
      TableName: DELIVERIES_TABLE,
      Key: { deliveryId },
      UpdateExpression: "SET #s = :r, routeId = :rid, estimatedDistance = :dist, estimatedDuration = :dur, routeSummary = :sum, updatedAt = :t",
      ConditionExpression: "#s = :cur",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":r": STATUSES.ROUTE_OPTIMIZED,
        ":cur": d.status,
        ":rid": route.routeId,
        ":dist": route.distance,
        ":dur": route.duration,
        ":sum": route.routeSummary,
        ":t": nowIso(),
      },
    }));
    await writeEvent({
      deliveryId, actorId: user.userId, actorRole: user.role,
      eventType: "ROUTE_OPTIMIZED", message: "Route computed and attached.",
    });
  } else {
    // Still attach the route data even if status doesn't transition (e.g. already PICKED_UP)
    await docClient.send(new UpdateCommand({
      TableName: DELIVERIES_TABLE,
      Key: { deliveryId },
      UpdateExpression: "SET routeId = :rid, estimatedDistance = :dist, estimatedDuration = :dur, routeSummary = :sum, updatedAt = :t",
      ExpressionAttributeValues: {
        ":rid": route.routeId, ":dist": route.distance, ":dur": route.duration, ":sum": route.routeSummary, ":t": nowIso(),
      },
    }));
  }

  const updated = await getItem(DELIVERIES_TABLE, { deliveryId });
  return json(200, { delivery: updated, route });
}

module.exports = { optimize };
