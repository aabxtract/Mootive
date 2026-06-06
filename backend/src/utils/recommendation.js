/**
 * AI rider recommendation + price/risk/route intelligence.
 *
 * Weighted scoring (per product spec):
 *   50% trust score
 *   30% pickup speed (faster is better)
 *   20% price (cheaper is better)
 */

const WEIGHTS = { trust: 0.5, pickup: 0.3, price: 0.2 };

/**
 * Min-max normalize a value to 0..1.
 * `higherIsBetter = false` flips it (used for price + pickup time, where
 * lower raw values should score higher). Falls back to 1 when all candidates
 * are equal, so a single rider isn't unfairly zeroed out.
 */
function normalize(value, min, max, higherIsBetter) {
  if (max === min) return 1;
  const ratio = (value - min) / (max - min);
  return higherIsBetter ? ratio : 1 - ratio;
}

function scoreRiders(riders) {
  const prices = riders.map((r) => r.estimatedPrice);
  const pickups = riders.map((r) => r.pickupMins);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minPickup = Math.min(...pickups);
  const maxPickup = Math.max(...pickups);

  return riders
    .map((r) => {
      const trustScore = r.trustScore / 100;
      const pickupScore = normalize(r.pickupMins, minPickup, maxPickup, false);
      const priceScore = normalize(r.estimatedPrice, minPrice, maxPrice, false);

      const score =
        WEIGHTS.trust * trustScore +
        WEIGHTS.pickup * pickupScore +
        WEIGHTS.price * priceScore;

      return {
        ...r,
        score: Number(score.toFixed(4)),
        breakdown: {
          trust: Number((WEIGHTS.trust * trustScore).toFixed(4)),
          pickup: Number((WEIGHTS.pickup * pickupScore).toFixed(4)),
          price: Number((WEIGHTS.price * priceScore).toFixed(4)),
        },
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Tag riders with human-readable badges: Cheapest / Fastest / Recommended.
 */
function applyBadges(scoredRiders, recommendedId) {
  const cheapestId = [...scoredRiders].sort(
    (a, b) => a.estimatedPrice - b.estimatedPrice
  )[0].id;
  const fastestId = [...scoredRiders].sort(
    (a, b) => a.pickupMins - b.pickupMins
  )[0].id;

  return scoredRiders.map((r) => {
    const badges = [];
    if (r.id === recommendedId) badges.push("Recommended");
    if (r.id === cheapestId) badges.push("Cheapest");
    if (r.id === fastestId) badges.push("Fastest");
    return { ...r, badges };
  });
}

/**
 * Build a one-line, natural explanation for why a rider is recommended,
 * relative to the cheapest option.
 */
function buildExplanation(recommended, riders, riskLevel) {
  const cheapest = [...riders].sort(
    (a, b) => a.estimatedPrice - b.estimatedPrice
  )[0];
  const priceDelta = recommended.estimatedPrice - cheapest.estimatedPrice;

  const priceLine =
    priceDelta <= 0
      ? "is also the cheapest option"
      : `only costs ₦${priceDelta} more than the cheapest rider`;

  return (
    `${recommended.name} is the best option because they have a ${recommended.trustScore}% trust score, ` +
    `a ${recommended.pickupMins}-min pickup time, and ${priceLine}. ` +
    `This delivery has ${riskLevel.toLowerCase()} risk.`
  );
}

/**
 * Delivery risk score from package value + urgency.
 * Returns a level + short note (simulated traffic/route intelligence).
 */
function assessRisk(delivery) {
  const value = Number(delivery.packageValue) || 0;
  const urgency = (delivery.urgency || "normal").toLowerCase();

  let points = 0;
  if (value >= 50000) points += 2;
  else if (value >= 15000) points += 1;
  if (urgency === "urgent" || urgency === "high") points += 1;

  let level = "Low";
  if (points >= 3) level = "High";
  else if (points >= 1) level = "Medium";

  const routeNote = `Moderate traffic expected between ${delivery.pickup} and ${delivery.dropoff}.`;
  return { level, routeNote };
}

/**
 * Fair price range derived from the available riders (±~10% around the mean).
 */
function fairPriceRange(riders) {
  const prices = riders.map((r) => r.estimatedPrice);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const low = Math.round((mean * 0.92) / 50) * 50;
  const high = Math.round((mean * 1.08) / 50) * 50;
  return { low, high };
}

/**
 * Top-level entry: given available riders + a delivery, return scored riders
 * (with badges), the recommended rider, and the price/risk/route intelligence
 * block shown on the rider selection screen.
 */
function recommend(riders, delivery) {
  const scored = scoreRiders(riders);
  const recommended = scored[0];
  const risk = assessRisk(delivery || {});
  const withBadges = applyBadges(scored, recommended.id);
  const { low, high } = fairPriceRange(riders);

  const estDeliveryMins = recommended.pickupMins + 20; // pickup + simulated transit

  return {
    riders: withBadges,
    recommendation: {
      riderId: recommended.id,
      riderName: recommended.name,
      explanation: buildExplanation(recommended, riders, risk.level),
    },
    intelligence: {
      fairPriceRange: { low, high },
      deliveryRisk: risk.level,
      estimatedDeliveryMins: estDeliveryMins,
      routeNote: risk.routeNote,
    },
  };
}

module.exports = { recommend, scoreRiders, assessRisk, fairPriceRange };
