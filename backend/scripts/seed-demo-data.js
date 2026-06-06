const {
  BatchWriteCommand,
  docClient,
} = require("../src/lib/dynamo");
const { users, riders } = require("../src/data/seed");

const USERS_TABLE = process.env.USERS_TABLE || "MootiveUsers";
const RIDERS_TABLE = process.env.RIDERS_TABLE || "MootiveRiders";

function now() {
  return new Date().toISOString();
}

function normalizeReceiverTag(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed.toLowerCase() : `@${trimmed.toLowerCase()}`;
}

async function seed() {
  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [USERS_TABLE]: users.map((user) => ({
          PutRequest: {
            Item: {
              userId: user.id,
              name: user.name,
              phoneNumber: user.phone,
              username: user.username,
              receiverTag: normalizeReceiverTag(user.receiverTag || user.username),
              role: user.role || "both",
              createdAt: now(),
              updatedAt: now(),
            },
          },
        })),
        [RIDERS_TABLE]: riders.map((rider) => ({
          PutRequest: {
            Item: {
              riderId: rider.id,
              name: rider.name,
              location: rider.location,
              distanceKm: rider.distanceKm,
              pickupMins: rider.pickupMins,
              estimatedPrice: rider.estimatedPrice,
              trustScore: rider.trustScore,
              available: rider.available !== false,
              availabilityStatus: rider.available === false ? "unavailable" : "available",
              createdAt: now(),
              updatedAt: now(),
            },
          },
        })),
      },
    })
  );

  console.log(`Seeded ${users.length} users into ${USERS_TABLE}`);
  console.log(`Seeded ${riders.length} riders into ${RIDERS_TABLE}`);
}

seed().catch((error) => {
  console.error("Failed to seed demo data", error);
  process.exitCode = 1;
});
