const store = require("../store");
const { recommend } = require("../utils/recommendation");

// Canonical delivery status timeline (per product spec).
const STATUS_FLOW = [
  "Created",
  "Accepted",
  "Picked Up",
  "In Transit",
  "Delivered",
  "Confirmed",
  "Completed",
];

// Payment split: 60% released after pickup, 40% after receiver confirmation.
const PICKUP_SPLIT = 0.6;
const CONFIRM_SPLIT = 0.4;

function timestamp() {
  return new Date().toISOString();
}

function pushStatus(delivery, status) {
  delivery.status = status;
  delivery.statusHistory.push({ status, at: timestamp() });
}

/**
 * Release the 60% pickup payout exactly once. Logs to the server console so the
 * trust/escrow layer is visible during the demo.
 */
function releasePickupPayout(delivery) {
  if (!delivery.payment || delivery.payment.releasedOnPickup) return;
  const amount = Math.round(delivery.payment.total * PICKUP_SPLIT);
  delivery.payment.releasedOnPickup = amount;
  delivery.payment.log.push({
    stage: "Picked Up",
    percent: 60,
    amount,
    at: timestamp(),
  });
  console.log(
    `💰  [${delivery.id}] Pickup reached → released 60% = ₦${amount} to ${delivery.rider.name}`
  );
}

/**
 * Release the remaining 40% payout exactly once, after receiver confirmation.
 */
function releaseConfirmPayout(delivery) {
  if (!delivery.payment || delivery.payment.releasedOnConfirm) return;
  const amount = delivery.payment.total - (delivery.payment.releasedOnPickup || 0);
  delivery.payment.releasedOnConfirm = amount;
  delivery.payment.log.push({
    stage: "Completed",
    percent: 40,
    amount,
    at: timestamp(),
  });
  console.log(
    `💰  [${delivery.id}] Receiver confirmed → released 40% = ₦${amount} to ${delivery.rider.name}. Payout complete.`
  );
}

// ---- Handlers --------------------------------------------------------------

/**
 * POST /api/deliveries
 * Create a delivery. Detects whether the receiver exists in the registry; if
 * not, generates a simple confirmation link (simulated).
 */
function createDelivery(req, res) {
  const {
    senderId,
    pickup,
    dropoff,
    receiverName,
    receiverTag,
    packageType,
    packageValue,
    urgency,
    note,
  } = req.body || {};

  if (!pickup || !dropoff || !receiverTag) {
    return res.status(400).json({
      error: "pickup, dropoff, and receiverTag are required.",
    });
  }

  const sender = senderId ? store.findUserById(senderId) : null;
  const receiver = store.findUserByTag(receiverTag);

  const id = store.newDeliveryId();
  const delivery = {
    id,
    sender: sender ? { id: sender.id, name: sender.name, phone: sender.phone } : { id: senderId || null, name: "Unknown sender" },
    pickup,
    dropoff,
    receiverName: receiverName || (receiver ? receiver.name : null),
    receiverTag,
    receiverId: receiver ? receiver.id : null,
    receiverFound: Boolean(receiver),
    confirmationLink: receiver ? null : `https://mootive.app/confirm/${id}`,
    packageType: packageType || "Parcel",
    packageValue: Number(packageValue) || 0,
    urgency: urgency || "normal",
    note: note || "",
    rider: null,
    fee: null,
    payment: null,
    recommendation: null,
    intelligence: null,
    dispute: null,
    status: "Created",
    statusHistory: [{ status: "Created", at: timestamp() }],
    createdAt: timestamp(),
  };

  store.addDelivery(delivery);

  res.status(201).json({
    delivery,
    receiver: receiver
      ? { found: true, message: `Receiver ${receiver.name} found. They will see this as an incoming delivery.` }
      : { found: false, message: "Receiver not in registry. A confirmation link was generated.", confirmationLink: delivery.confirmationLink },
  });
}

/**
 * GET /api/deliveries
 * List all deliveries (optionally filter by ?senderId= or ?receiverTag=).
 */
function listDeliveries(req, res) {
  let deliveries = store.getDeliveries();
  const { senderId, receiverTag } = req.query;
  if (senderId) deliveries = deliveries.filter((d) => d.sender.id === senderId);
  if (receiverTag) {
    const t = String(receiverTag).toLowerCase();
    deliveries = deliveries.filter((d) => d.receiverTag && d.receiverTag.toLowerCase() === t);
  }
  res.json({ count: deliveries.length, deliveries });
}

/**
 * GET /api/deliveries/:id
 */
function getDelivery(req, res) {
  const delivery = store.findDeliveryById(req.params.id);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });
  res.json({ delivery });
}

/**
 * GET /api/deliveries/:id/riders
 * Simulated nearby-rider search + AI recommendation + price/risk intelligence.
 * The recommendation block is cached on the delivery for the selection screen.
 */
function findRiders(req, res) {
  const delivery = store.findDeliveryById(req.params.id);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });

  const available = store.getRiders().filter((r) => r.available);
  if (available.length === 0) {
    return res.status(503).json({ error: "No riders available right now." });
  }

  const result = recommend(available, delivery);

  // Cache the AI output on the delivery so other screens can reuse it.
  delivery.recommendation = result.recommendation;
  delivery.intelligence = result.intelligence;
  store.save();

  res.json({
    message: "Finding nearby riders...",
    ...result,
  });
}

/**
 * POST /api/deliveries/:id/select-rider  { riderId }
 * Attach a rider, set the fee + payment split, and move status to Accepted.
 */
function selectRider(req, res) {
  const delivery = store.findDeliveryById(req.params.id);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });

  const { riderId } = req.body || {};
  const rider = store.findRiderById(riderId);
  if (!rider) return res.status(404).json({ error: "Rider not found" });

  const total = rider.estimatedPrice;
  delivery.rider = { ...rider };
  delivery.fee = total;
  delivery.payment = {
    total,
    currency: "NGN",
    pickupShare: Math.round(total * PICKUP_SPLIT),
    confirmShare: total - Math.round(total * PICKUP_SPLIT),
    releasedOnPickup: 0,
    releasedOnConfirm: 0,
    lockedUntilConfirm: total - Math.round(total * PICKUP_SPLIT),
    log: [],
  };

  pushStatus(delivery, "Accepted");
  store.save();

  res.json({
    delivery,
    payment: {
      deliveryFee: total,
      riderPayoutAfterPickup: delivery.payment.pickupShare,
      lockedUntilReceiverConfirms: delivery.payment.confirmShare,
      note: "60% released to rider after pickup, 40% released after receiver confirms.",
    },
  });
}

/**
 * PATCH /api/deliveries/:id/status  { status }
 * Advance the delivery status. Triggers the 60% payout when status hits
 * "Picked Up". "Confirmed"/"Completed" are normally driven by the receiver
 * confirm endpoint, but are accepted here too for demo flexibility.
 */
function updateStatus(req, res) {
  const delivery = store.findDeliveryById(req.params.id);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });

  const { status } = req.body || {};
  if (!STATUS_FLOW.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${STATUS_FLOW.join(", ")}`,
    });
  }
  if (!delivery.rider) {
    return res.status(400).json({ error: "Select a rider before updating status." });
  }

  pushStatus(delivery, status);

  if (status === "Picked Up") releasePickupPayout(delivery);
  if (status === "Completed") releaseConfirmPayout(delivery);
  store.save();

  res.json({ delivery });
}

/**
 * POST /api/deliveries/:id/confirm
 * Receiver confirms delivery → release remaining 40%, mark Confirmed + Completed.
 */
function confirmDelivery(req, res) {
  const delivery = store.findDeliveryById(req.params.id);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });

  if (!delivery.rider || !delivery.payment) {
    return res.status(400).json({ error: "No rider selected for this delivery." });
  }
  if (delivery.status !== "Delivered") {
    return res.status(409).json({
      error: `Delivery must be in 'Delivered' status to confirm. Current: '${delivery.status}'.`,
    });
  }

  pushStatus(delivery, "Confirmed");
  releaseConfirmPayout(delivery);
  pushStatus(delivery, "Completed");
  store.save();

  res.json({
    message: "Delivery confirmed. Remaining rider payout released.",
    delivery,
    summary: buildCompletionSummary(delivery),
  });
}

function buildCompletionSummary(delivery) {
  return {
    deliveryId: delivery.id,
    packageType: delivery.packageType,
    rider: delivery.rider.name,
    receiverName: delivery.receiverName,
    status: delivery.status,
    totalDeliveryFee: delivery.payment.total,
    payoutReleasedAfterPickup: delivery.payment.releasedOnPickup,
    payoutReleasedAfterConfirmation: delivery.payment.releasedOnConfirm,
    message: "Delivery Completed — your package was confirmed by the receiver. Rider payout has been fully released.",
  };
}

/**
 * POST /api/deliveries/:id/dispute  { reason }
 * Simulated dispute ticket — backup scenario when a receiver doesn't confirm.
 */
function raiseDispute(req, res) {
  const delivery = store.findDeliveryById(req.params.id);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });

  const { reason } = req.body || {};
  const ticket = {
    ticketId: store.newDisputeId(),
    deliveryId: delivery.id,
    riderName: delivery.rider ? delivery.rider.name : null,
    receiverName: delivery.receiverName,
    deliveryStatus: delivery.status,
    reason: reason || "Receiver has not confirmed delivery.",
    routeRecord: `${delivery.pickup} → ${delivery.dropoff}`,
    status: "Under Review",
    createdAt: timestamp(),
  };
  delivery.dispute = ticket;
  store.save();

  res.status(201).json({
    message: "Receiver has not confirmed delivery. Rider can raise a ticket.",
    ticket,
  });
}

/**
 * GET /api/deliveries/:id/dispute
 */
function getDispute(req, res) {
  const delivery = store.findDeliveryById(req.params.id);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });
  if (!delivery.dispute) {
    return res.status(404).json({ error: "No dispute ticket for this delivery." });
  }
  res.json({ ticket: delivery.dispute });
}

module.exports = {
  STATUS_FLOW,
  createDelivery,
  listDeliveries,
  getDelivery,
  findRiders,
  selectRider,
  updateStatus,
  confirmDelivery,
  raiseDispute,
  getDispute,
};
