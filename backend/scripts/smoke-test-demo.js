require("dotenv").config({ quiet: true });
require("dotenv").config({ path: "../frontend/.env", quiet: true });

const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const API = (process.env.API_URL || process.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const REGION = process.env.AWS_REGION || process.env.VITE_AWS_REGION || "us-east-1";
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID || process.env.VITE_COGNITO_USER_POOL_CLIENT_ID;
const PASSWORD = process.env.DEMO_PASSWORD || "MootiveDemo1!";

const SELLER_EMAIL = process.env.SMOKE_SELLER_EMAIL || "tara@mootive.test";
const DRIVER_EMAIL = process.env.SMOKE_DRIVER_EMAIL || "kunle@mootive.test";

const required = [
  ["API_URL or VITE_API_BASE_URL", API],
  ["AWS_REGION or VITE_AWS_REGION", REGION],
  ["USER_POOL_CLIENT_ID or VITE_COGNITO_USER_POOL_CLIENT_ID", CLIENT_ID],
];

const missing = required.filter(([, value]) => !value).map(([name]) => name);
if (missing.length) {
  console.error(`Missing required env variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
  process.exit(1);
}

const cognito = new CognitoIdentityProviderClient({ region: REGION });

function logStep(n, name) {
  console.log(`\n${n}. ${name}`);
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function login(email) {
  const result = await cognito.send(new InitiateAuthCommand({
    ClientId: CLIENT_ID,
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: {
      USERNAME: email,
      PASSWORD,
    },
  }));
  return result.AuthenticationResult.IdToken;
}

async function request(method, path, token, body) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(`${method} ${path} failed with ${res.status}: ${JSON.stringify(data)}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function main() {
  logStep(1, "seller login");
  const sellerToken = await login(SELLER_EMAIL);
  console.log(`OK: ${SELLER_EMAIL}`);

  logStep(2, "driver login");
  const driverToken = await login(DRIVER_EMAIL);
  console.log(`OK: ${DRIVER_EMAIL}`);

  logStep(3, "GET /users/me");
  const me = await request("GET", "/users/me", sellerToken);
  print(me);

  logStep(4, "driver availability");
  const availability = await request("PATCH", "/drivers/availability", driverToken, {
    available: true,
    lat: 6.5095,
    lng: 3.3711,
    currentArea: "Yaba",
  });
  print(availability);

  logStep(5, "seller creates delivery");
  const created = await request("POST", "/deliveries", sellerToken, {
    pickupAddress: "12 Hughes Avenue, Yaba",
    pickupArea: "Yaba",
    pickupLat: 6.515,
    pickupLng: 3.385,
    dropoffAddress: "Admiralty Way, Lekki Phase 1",
    dropoffArea: "Lekki Phase 1",
    dropoffLat: 6.447,
    dropoffLng: 3.471,
    receiverName: "Smoke Test Receiver",
    receiverPhone: `+2348009${Date.now().toString().slice(-7)}`,
    packageType: "Fashion item",
    packageValue: 35000,
    urgency: "same day",
    deliveryNote: "Automated smoke test delivery",
  });
  const deliveryId = created.delivery.deliveryId;
  const confirmationToken = created.receiver.confirmationToken;
  print({ deliveryId, status: created.delivery.status, confirmationToken });

  logStep(6, "delivery analyze endpoint");
  const analyzed = await request("POST", `/deliveries/${encodeURIComponent(deliveryId)}/analyze`, sellerToken, {});
  print({ deliveryId, status: analyzed.delivery.status, recommendedDriverId: analyzed.delivery.recommendedDriverId });

  logStep(7, "drivers see open jobs");
  const openJobs = await request("GET", "/drivers/jobs/open", driverToken);
  print({ count: openJobs.count, deliveryVisible: openJobs.deliveries.some((d) => d.deliveryId === deliveryId) });

  logStep(8, "driver accepts job");
  const accepted = await request("POST", `/drivers/jobs/${encodeURIComponent(deliveryId)}/accept`, driverToken, {});
  print({ deliveryId, status: accepted.delivery.status, driverId: accepted.driverId });

  logStep(9, "optimize route");
  const route = await request("POST", `/deliveries/${encodeURIComponent(deliveryId)}/optimize-route`, driverToken, {});
  print({ deliveryId, status: route.delivery.status, routeId: route.route.routeId, distance: route.route.distance, duration: route.route.duration });

  logStep(10, "status update");
  const pickedUp = await request("POST", `/deliveries/${encodeURIComponent(deliveryId)}/status`, driverToken, { status: "PICKED_UP" });
  const inTransit = await request("POST", `/deliveries/${encodeURIComponent(deliveryId)}/status`, driverToken, { status: "IN_TRANSIT" });
  const delivered = await request("POST", `/deliveries/${encodeURIComponent(deliveryId)}/status`, driverToken, { status: "DELIVERED" });
  print({
    pickedUp: pickedUp.delivery.status,
    inTransit: inTransit.delivery.status,
    delivered: delivered.delivery.status,
  });

  logStep(11, "receiver confirms delivery");
  const confirmed = await request("POST", `/deliveries/${encodeURIComponent(deliveryId)}/confirm`, null, { confirmationToken });
  print({ deliveryId, status: confirmed.delivery.status });

  console.log("\nSmoke test completed successfully.");
}

main().catch((error) => {
  console.error("\nSmoke test failed.");
  console.error(error.message);
  if (error.data) print(error.data);
  process.exit(1);
});
