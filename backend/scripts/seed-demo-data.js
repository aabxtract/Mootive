/*
 * Seed demo data after `sam deploy`.
 *
 * Required env vars:
 *   USER_POOL_ID, USER_POOL_CLIENT_ID, AWS_REGION
 * Optional:
 *   USERS_TABLE, DRIVERS_TABLE
 *
 * Usage:
 *   node scripts/seed-demo-data.js
 */

require("dotenv").config({ quiet: true });

const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { putItem } = require("../src/lib/dynamo");
const { makeId } = require("../src/lib/ids");

const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
const AWS_REGION = process.env.AWS_REGION;
const USERS_TABLE = process.env.USERS_TABLE || "MootiveUsers";
const DRIVERS_TABLE = process.env.DRIVERS_TABLE || "MootiveDrivers";

const missingEnv = [
  ["USER_POOL_ID", USER_POOL_ID],
  ["USER_POOL_CLIENT_ID", USER_POOL_CLIENT_ID],
  ["AWS_REGION", AWS_REGION],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingEnv.length > 0) {
  console.error(`Missing required env variable${missingEnv.length > 1 ? "s" : ""}: ${missingEnv.join(", ")}`);
  console.error("Create backend/.env or export them before running `npm run seed:demo`.");
  process.exit(1);
}

const cognito = new CognitoIdentityProviderClient({ region: AWS_REGION });

const DEMO_PASSWORD = "MootiveDemo1!";

const SELLERS = [
  { email: "tara@mootive.test", name: "Tara Styles", username: "tarastyles", phone: "+2348000000001" },
];

const DRIVERS = [
  { email: "kunle@mootive.test", name: "Kunle Adebayo", username: "kunlerides", phone: "+2348000000010", lat: 6.5095, lng: 3.3711, area: "Yaba", trustScore: 92, completionRate: 98, averagePickupTime: 8 },
  { email: "ifeanyi@mootive.test", name: "Ifeanyi Okeke", username: "ifeanyimoves", phone: "+2348000000011", lat: 6.4488, lng: 3.4641, area: "Lekki Phase 1", trustScore: 88, completionRate: 95, averagePickupTime: 12 },
];

function now() { return new Date().toISOString(); }

async function ensureCognitoUser({ email, name }) {
  try {
    await cognito.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: email }));
    console.log(`  Cognito user exists: ${email}`);
  } catch {
    await cognito.send(new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
        { Name: "name", Value: name },
      ],
      MessageAction: "SUPPRESS",
    }));
    console.log(`  Created Cognito user: ${email}`);
  }
  await cognito.send(new AdminSetUserPasswordCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    Password: DEMO_PASSWORD,
    Permanent: true,
  }));

  const res = await cognito.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: email }));
  const sub = res.UserAttributes.find((a) => a.Name === "sub").Value;
  return sub;
}

async function seedSellers() {
  for (const s of SELLERS) {
    const sub = await ensureCognitoUser(s);
    await putItem(USERS_TABLE, {
      userId: makeId("USR"),
      cognitoSub: sub,
      name: s.name,
      email: s.email,
      phoneNumber: s.phone,
      username: s.username,
      role: "seller_receiver",
      createdAt: now(),
      updatedAt: now(),
    });
    console.log(`  Seeded seller_receiver: ${s.name}`);
  }
}

async function seedDrivers() {
  for (const d of DRIVERS) {
    const sub = await ensureCognitoUser(d);
    const userId = makeId("USR");
    await putItem(USERS_TABLE, {
      userId, cognitoSub: sub, name: d.name, email: d.email,
      phoneNumber: d.phone, username: d.username, role: "driver",
      createdAt: now(), updatedAt: now(),
    });
    await putItem(DRIVERS_TABLE, {
      driverId: makeId("DRV"),
      userId,
      name: d.name,
      phoneNumber: d.phone,
      currentArea: d.area,
      currentLat: d.lat,
      currentLng: d.lng,
      vehicleType: "motorcycle",
      trustScore: d.trustScore,
      completionRate: d.completionRate,
      averagePickupTime: d.averagePickupTime,
      availabilityStatus: "available",
      createdAt: now(),
      updatedAt: now(),
    });
    console.log(`  Seeded driver: ${d.name} in ${d.area}`);
  }
}

(async () => {
  console.log("Seeding Mootive demo data...");
  await seedSellers();
  await seedDrivers();
  console.log(`\nDone. All demo users password: ${DEMO_PASSWORD}`);
})().catch((e) => { console.error(e); process.exit(1); });
