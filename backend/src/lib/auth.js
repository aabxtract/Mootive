const { query } = require("./dynamo");
const { getClaims } = require("./http");

const USERS_TABLE = process.env.USERS_TABLE || "MootiveUsers";

async function getCurrentUser(event) {
  const claims = getClaims(event);
  if (!claims?.sub) return null;
  const rows = await query(USERS_TABLE, {
    IndexName: "cognitoSub-index",
    KeyConditionExpression: "cognitoSub = :s",
    ExpressionAttributeValues: { ":s": claims.sub },
    Limit: 1,
  });
  const user = rows[0] || null;
  if (user) user._claims = claims;
  return user;
}

function requireAuth(user) {
  if (!user) return { error: { statusCode: 401, message: "Not authenticated. Sign in first." } };
  return null;
}

function requireRole(user, role) {
  const authErr = requireAuth(user);
  if (authErr) return authErr;
  if (user.role !== role) return { error: { statusCode: 403, message: `Requires role ${role}. You are ${user.role}.` } };
  return null;
}

module.exports = { getCurrentUser, requireAuth, requireRole };
