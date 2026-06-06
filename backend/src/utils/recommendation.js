const WEIGHTS = { trust: 0.5, pickup: 0.3, price: 0.2 };

function normalize(value, min, max, higherIsBetter) {
  if (max === min) return 1;
  const ratio = (value - min) / (max - min);
  return higherIsBetter ? ratio : 1 - ratio;
}

function scoreRiders(riders) {
  const prices = riders.map((rider) => rider.estimatedPrice);
  const pickups = riders.map((rider) => rider.pickupMins);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minPickup = Math.min(...pickups);
  const maxPickup = Math.max(...pickups);

  return riders
    .map((rider) => {
      const trustScore = rider.trustScore / 100;
      const pickupScore = normalize(rider.pickupMins, minPickup, maxPickup, false);
      const priceScore = normalize(rider.estimatedPrice, minPrice, maxPrice, false);
      const score =
        WEIGHTS.trust * trustScore +
        WEIGHTS.pickup * pickupScore +
        WEIGHTS.price * priceScore;

      return {
        ...rider,
        score: Number(score.toFixed(4)),
        breakdown: {
          trust: Number((WEIGHTS.trust * trustScore).toFixed(4)),
          pickup: Number((WEIGHTS.pickup * pickupScore).toFixed(4)),
          price: Number((WEIGHTS.price * priceScore).toFixed(4)),
        },
      };
    })
    .sort((left, right) => right.score - left.score);
}

function applyBadges(scoredRiders, recommendedId) {
  const cheapestId = [...scoredRiders].sort(
    (left, right) => left.estimatedPrice - right.estimatedPrice
  )[0].id;
  const fastestId = [...scoredRiders].sort(
    (left, right) => left.pickupMins - right.pickupMins
  )[0].id;

  return scoredRiders.map((rider) => {
    const badges = [];
    if (rider.id === recommendedId) badges.push("Recommended");
    if (rider.id === cheapestId) badges.push("Cheapest");
    if (rider.id === fastestId) badges.push("Fastest");
    return { ...rider, badges };
  });
}

function buildExplanation(recommended, riders, riskLevel) {
  const cheapest = [...riders].sort(
    (left, right) => left.estimatedPrice - right.estimatedPrice
  )[0];
  const priceDelta = recommended.estimatedPrice - cheapest.estimatedPrice;
  const priceLine =
    priceDelta <= 0
      ? "is also the cheapest option"
      : `only costs NGN ${priceDelta} more than the cheapest rider`;

  return (
    `${recommended.name} is the best option because they have a ${recommended.trustScore}% trust score, ` +
    `a ${recommended.pickupMins}-min pickup time, and ${priceLine}. ` +
    `This delivery has ${riskLevel.toLowerCase()} risk.`
  );
}

function assessRisk(delivery) {
  const value = Number(delivery.packageValue) || 0;
  const urgency = String(delivery.urgency || "normal").toLowerCase();

  let points = 0;
  if (value >= 50000) points += 2;
  else if (value >= 15000) points += 1;
  if (urgency === "urgent" || urgency === "high" || urgency === "same day") points += 1;

  let level = "Low";
  if (points >= 3) level = "High";
  else if (points >= 1) level = "Medium";

  return {
    level,
    routeNote: `Moderate traffic expected between ${delivery.pickup} and ${delivery.dropoff}.`,
  };
}

function fairPriceRange(riders) {
  const prices = riders.map((rider) => rider.estimatedPrice);
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const low = Math.round((mean * 0.92) / 50) * 50;
  const high = Math.round((mean * 1.08) / 50) * 50;
  return { low, high };
}

function recommend(riders, delivery) {
  const scored = scoreRiders(riders);
  const recommended = scored[0];
  const risk = assessRisk(delivery || {});
  const withBadges = applyBadges(scored, recommended.id);
  const { low, high } = fairPriceRange(riders);

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
      estimatedDeliveryMins: recommended.pickupMins + 20,
      routeNote: risk.routeNote,
    },
  };
}

module.exports = { recommend, scoreRiders, assessRisk, fairPriceRange };
