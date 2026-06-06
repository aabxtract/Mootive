const { getItem, putItem, query, UpdateCommand, docClient } = require("../lib/dynamo");
const { json, getClaims, nowIso } = require("../lib/http");
const { makeId } = require("../lib/ids");
const { getCurrentUser, requireAuth } = require("../lib/auth");

const USERS_TABLE = process.env.USERS_TABLE || "MootiveUsers";

const VALID_ROLES = ["seller_receiver", "driver"];

function normalizePhone(v) {
  return String(v || "").trim().replace(/\s+/g, "");
}

function normalizeUsername(v) {
  return String(v || "").trim().toLowerCase().replace(/^@/, "");
}

async function findByUsername(username) {
  const rows = await query(USERS_TABLE, {
    IndexName: "username-index",
    KeyConditionExpression: "username = :u",
    ExpressionAttributeValues: { ":u": normalizeUsername(username) },
    Limit: 1,
  });
  return rows[0] || null;
}

async function findByPhone(phone) {
  const rows = await query(USERS_TABLE, {
    IndexName: "phoneNumber-index",
    KeyConditionExpression: "phoneNumber = :p",
    ExpressionAttributeValues: { ":p": normalizePhone(phone) },
    Limit: 1,
  });
  return rows[0] || null;
}

async function createProfile(event, ctx) {
  const claims = getClaims(event);
  if (!claims?.sub) return json(401, { message: "No Cognito identity on request." });

  const existing = await getCurrentUser(event);
  if (existing) return json(200, { created: false, user: existing });

  const { name, phoneNumber, username, role } = ctx.body;
  if (!VALID_ROLES.includes(role)) {
    return json(400, { message: `role must be one of ${VALID_ROLES.join(", ")}.` });
  }
  if (!name) return json(400, { message: "name is required." });

  const cleanUsername = normalizeUsername(username || name.split(" ")[0]);
  const cleanPhone = normalizePhone(phoneNumber);

  if (cleanUsername && (await findByUsername(cleanUsername))) {
    return json(409, { message: "Username already taken." });
  }

  const user = {
    userId: makeId("USR"),
    cognitoSub: claims.sub,
    name,
    email: claims.email || null,
    phoneNumber: cleanPhone || null,
    username: cleanUsername,
    role,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await putItem(USERS_TABLE, user);
  return json(201, { created: true, user });
}

async function getMe(event) {
  const user = await getCurrentUser(event);
  const err = requireAuth(user);
  if (err) return json(err.error.statusCode, { message: err.error.message });
  return json(200, { user });
}

async function updateMe(event, ctx) {
  const user = await getCurrentUser(event);
  const err = requireAuth(user);
  if (err) return json(err.error.statusCode, { message: err.error.message });

  const updates = {};
  if (ctx.body.name) updates.name = ctx.body.name;
  if (ctx.body.phoneNumber !== undefined) updates.phoneNumber = normalizePhone(ctx.body.phoneNumber);
  if (ctx.body.username) {
    const newU = normalizeUsername(ctx.body.username);
    if (newU !== user.username) {
      const conflict = await findByUsername(newU);
      if (conflict) return json(409, { message: "Username already taken." });
      updates.username = newU;
    }
  }
  if (!Object.keys(updates).length) return json(200, { user });

  const sets = [];
  const values = { ":t": nowIso() };
  const names = {};
  for (const [k, v] of Object.entries(updates)) {
    sets.push(`#${k} = :${k}`);
    values[`:${k}`] = v;
    names[`#${k}`] = k;
  }
  sets.push("updatedAt = :t");

  await docClient.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId: user.userId },
    UpdateExpression: "SET " + sets.join(", "),
    ExpressionAttributeValues: values,
    ExpressionAttributeNames: names,
  }));

  return json(200, { user: { ...user, ...updates, updatedAt: nowIso() } });
}

async function checkReceiver(event, ctx) {
  const tag = ctx.qs.tag;
  if (!tag) return json(400, { message: "tag query parameter is required." });

  const byU = await findByUsername(tag);
  const found = byU || (await findByPhone(tag));

  if (found) {
    return json(200, {
      receiverFound: true,
      userId: found.userId,
      name: found.name,
      username: found.username,
      phoneNumber: found.phoneNumber,
    });
  }

  return json(200, {
    receiverFound: false,
    confirmationMode: "sms_link",
    confirmationToken: `CONFIRM-${makeId("T").split("-").slice(-1)[0]}`,
  });
}

module.exports = { createProfile, getMe, updateMe, checkReceiver, findByUsername, findByPhone };
