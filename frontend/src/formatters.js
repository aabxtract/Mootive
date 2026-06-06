export function formatMoney(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function normalizeReceiverTag(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export function riskTone(value) {
  return String(value || "low").toLowerCase();
}

export function buildCompletionSummary(delivery) {
  if (!delivery?.payment) return null;
  return {
    deliveryId: delivery.id,
    packageType: delivery.packageType,
    rider: delivery.rider?.name || "Unknown rider",
    receiverName: delivery.receiverName || delivery.receiverTag,
    status: delivery.status,
    totalDeliveryFee: delivery.payment.total,
    payoutReleasedAfterPickup: delivery.payment.releasedOnPickup,
    payoutReleasedAfterConfirmation: delivery.payment.releasedOnConfirm,
    message:
      "Delivery completed — your package was confirmed by the receiver. Rider payout has been fully released.",
  };
}
