function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function noContent() {
  return {
    statusCode: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    },
    body: "",
  };
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

module.exports = { json, noContent, parseBody };
