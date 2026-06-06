const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { getItem, putItem, query, UpdateCommand, docClient, scan } = require("../lib/dynamo");
const { json, nowIso } = require("../lib/http");
const { getCurrentUser, requireAuth } = require("../lib/auth");
const { writeEvent } = require("../lib/events");
const { STATUSES, canTransition } = require("../lib/statuses");

const DELIVERIES_TABLE = process.env.DELIVERIES_TABLE || "MootiveDeliveries";
const DRIVERS_TABLE = process.env.DRIVERS_TABLE || "MootiveDrivers";
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || "anthropic.claude-haiku-4-5-20251001-v1:0";

const bedrock = new BedrockRuntimeClient({});

const SCORE_WEIGHTS = { trust: 0.5, pickup: 0.3, price: 0.2 };

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function estimatePrice(distanceKm, urgency) {
  const base = 800;
  const perKm = 120;
  const urgencyMult = urgency === "urgent" || urgency === "same day" ? 1.25 : 1.0;
  return Math.round(((base + perKm * distanceKm) * urgencyMult) / 50) * 50;
}

function scoreDrivers(drivers, delivery) {
  const enriched = drivers.map((d) => {
    const distanceToPickup = (d.currentLat != null && d.currentLng != null)
      ? haversineKm(d.currentLat, d.currentLng, delivery.pickupLat, delivery.pickupLng)
      : 5;
    const pickupMins = Math.max(3, Math.round(distanceToPickup * 2.5 + (d.averagePickupTime || 10) * 0.3));
    const deliveryKm = haversineKm(delivery.pickupLat, delivery.pickupLng, delivery.dropoffLat, delivery.dropoffLng);
    const estimatedPrice = estimatePrice(deliveryKm, delivery.urgency);
    return { ...d, distanceToPickupKm: Number(distanceToPickup.toFixed(2)), pickupMins, estimatedPrice };
  });

  const prices = enriched.map((d) => d.estimatedPrice);
  const pickups = enriched.map((d) => d.pickupMins);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const minT = Math.min(...pickups), maxT = Math.max(...pickups);
  const norm = (v, lo, hi, higher) => (hi === lo ? 1 : (higher ? (v - lo) / (hi - lo) : 1 - (v - lo) / (hi - lo)));

  return enriched
    .map((d) => {
      const trustN = (d.trustScore || 0) / 100;
      const pickupN = norm(d.pickupMins, minT, maxT, false);
      const priceN = norm(d.estimatedPrice, minP, maxP, false);
      const score = SCORE_WEIGHTS.trust * trustN + SCORE_WEIGHTS.pickup * pickupN + SCORE_WEIGHTS.price * priceN;
      return { ...d, score: Number(score.toFixed(4)) };
    })
    .sort((a, b) => b.score - a.score);
}

function assessRisk(delivery) {
  const value = Number(delivery.packageValue) || 0;
  const urgency = String(delivery.urgency || "normal").toLowerCase();
  const reasons = [];
  let points = 0;
  if (value >= 50000) { points += 2; reasons.push(`High package value (NGN ${value}).`); }
  else if (value >= 15000) { points += 1; reasons.push(`Moderate package value (NGN ${value}).`); }
  if (urgency === "urgent" || urgency === "same day") { points += 1; reasons.push(`Urgent delivery requested.`); }
  const distanceKm = haversineKm(delivery.pickupLat, delivery.pickupLng, delivery.dropoffLat, delivery.dropoffLng);
  if (distanceKm > 15) { points += 1; reasons.push(`Long route (${distanceKm.toFixed(1)} km).`); }
  const level = points >= 3 ? "HIGH" : points >= 1 ? "MEDIUM" : "LOW";
  return { level, score: points, reasons };
}

function fairPrice(scored) {
  const prices = scored.map((d) => d.estimatedPrice);
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  return { min: Math.round((mean * 0.92) / 50) * 50, max: Math.round((mean * 1.08) / 50) * 50 };
}

async function explainWithClaude({ recommended, delivery, risk, fair }) {
  const system = "You are Mootive's logistics explainer. Output ONLY a JSON object matching the requested schema. Be concise (each field 1-2 sentences). No prose outside JSON.";
  const userText = `Explain the deterministic decisions below for a Nigerian motorcycle dispatch app.

Recommended driver: ${recommended.name} (trust ${recommended.trustScore}%, pickup ~${recommended.pickupMins} min, NGN ${recommended.estimatedPrice})
Delivery: ${delivery.pickupAddress} -> ${delivery.dropoffAddress}, package "${delivery.packageType}" worth NGN ${delivery.packageValue}, urgency ${delivery.urgency}.
Risk: ${risk.level} (${risk.reasons.join(" ") || "no flagged factors"}).
Fair price range: NGN ${fair.min}-${fair.max}.

Respond with JSON:
{
  "driverRecommendation": "why this driver was picked",
  "fairPrice": "why this range is fair",
  "risk": "what makes this delivery ${risk.level} risk",
  "route": "one-sentence route note for the rider"
}`;

  const cmd = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 600,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
    }),
  });

  const res = await bedrock.send(cmd);
  const payload = JSON.parse(new TextDecoder().decode(res.body));
  const text = payload.content?.[0]?.text || "{}";
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : text);
  } catch {
    return { driverRecommendation: text };
  }
}

async function runAnalyze(delivery, actor) {
  const driverRows = await query(DRIVERS_TABLE, {
    IndexName: "availability-index",
    KeyConditionExpression: "availabilityStatus = :a",
    ExpressionAttributeValues: { ":a": "available" },
  });

  if (!driverRows.length) {
    await docClient.send(new UpdateCommand({
      TableName: DELIVERIES_TABLE,
      Key: { deliveryId: delivery.deliveryId },
      UpdateExpression: "SET #s = :a, updatedAt = :t",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":a": STATUSES.ANALYZED, ":t": nowIso() },
    }));
    await writeEvent({
      deliveryId: delivery.deliveryId, actorId: actor?.userId, actorRole: actor?.role || "system",
      eventType: "ANALYZED", message: "Analyzed with no available drivers.",
    });
    return await getItem(DELIVERIES_TABLE, { deliveryId: delivery.deliveryId });
  }

  const scored = scoreDrivers(driverRows, delivery);
  const recommended = scored[0];
  const risk = assessRisk(delivery);
  const fair = fairPrice(scored);

  let explanations = {};
  try {
    explanations = await explainWithClaude({ recommended, delivery, risk, fair });
  } catch (e) {
    console.error("Bedrock invoke failed:", e.message);
    explanations = {
      driverRecommendation: `${recommended.name} balances a ${recommended.trustScore}% trust score with the fastest pickup.`,
      fairPrice: `Estimated from ${scored.length} available drivers.`,
      risk: `Risk assessed ${risk.level}.`,
      route: `Route from ${delivery.pickupArea || delivery.pickupAddress} to ${delivery.dropoffArea || delivery.dropoffAddress}.`,
      _aiFallback: true,
    };
  }

  const aiRecommendation = {
    recommendedDriverId: recommended.driverId,
    recommendedDriverName: recommended.name,
    explanations,
    scoredDrivers: scored.map((d) => ({
      driverId: d.driverId, name: d.name, score: d.score,
      trustScore: d.trustScore, pickupMins: d.pickupMins, estimatedPrice: d.estimatedPrice,
    })),
  };

  // ANALYZED then OPEN_FOR_DRIVERS
  await docClient.send(new UpdateCommand({
    TableName: DELIVERIES_TABLE,
    Key: { deliveryId: delivery.deliveryId },
    UpdateExpression: "SET #s = :a, recommendedDriverId = :r, fairPriceMin = :fmin, fairPriceMax = :fmax, riskScore = :rs, riskReasons = :rr, aiRecommendation = :ai, totalDeliveryFee = :fee, updatedAt = :t",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: {
      ":a": STATUSES.ANALYZED,
      ":r": recommended.driverId,
      ":fmin": fair.min,
      ":fmax": fair.max,
      ":rs": risk.level,
      ":rr": risk.reasons,
      ":ai": aiRecommendation,
      ":fee": recommended.estimatedPrice,
      ":t": nowIso(),
    },
  }));
  await writeEvent({
    deliveryId: delivery.deliveryId, actorId: actor?.userId, actorRole: actor?.role || "system",
    eventType: "ANALYZED", message: "Deterministic scoring + Claude explanations attached.",
  });

  await docClient.send(new UpdateCommand({
    TableName: DELIVERIES_TABLE,
    Key: { deliveryId: delivery.deliveryId },
    UpdateExpression: "SET #s = :o, updatedAt = :t",
    ConditionExpression: "#s = :a",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":o": STATUSES.OPEN_FOR_DRIVERS, ":a": STATUSES.ANALYZED, ":t": nowIso() },
  }));
  await writeEvent({
    deliveryId: delivery.deliveryId, actorId: actor?.userId, actorRole: actor?.role || "system",
    eventType: "OPEN_FOR_DRIVERS", message: "Delivery opened to available drivers.",
  });

  return await getItem(DELIVERIES_TABLE, { deliveryId: delivery.deliveryId });
}

async function analyze(event, ctx) {
  const user = await getCurrentUser(event);
  const err = requireAuth(user);
  if (err) return json(err.error.statusCode, { message: err.error.message });

  const d = await getItem(DELIVERIES_TABLE, { deliveryId: ctx.params.deliveryId });
  if (!d) return json(404, { message: "Delivery not found." });
  if (d.senderId !== user.userId) return json(403, { message: "Only the sender can re-analyze." });

  const updated = await runAnalyze(d, user);
  return json(200, { delivery: updated });
}

module.exports = { analyze, runAnalyze, scoreDrivers, assessRisk, fairPrice, haversineKm };
