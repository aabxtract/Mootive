const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

function noContent() {
  return { statusCode: 204, headers: CORS_HEADERS, body: "" };
}

function parseBody(event) {
  if (!event.body) return {};
  if (typeof event.body === "object") return event.body;
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function parseQuery(event) {
  return event.queryStringParameters || {};
}

function getClaims(event) {
  const c = event.requestContext?.authorizer?.jwt?.claims;
  if (!c) return null;
  return {
    sub: c.sub,
    email: c.email,
    username: c["cognito:username"],
  };
}

function nowIso() {
  return new Date().toISOString();
}

module.exports = { json, noContent, parseBody, parseQuery, getClaims, nowIso, CORS_HEADERS };
