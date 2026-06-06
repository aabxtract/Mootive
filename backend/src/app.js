const { json, noContent, parseBody, parseQuery } = require("./lib/http");
const users = require("./routes/users");
const drivers = require("./routes/drivers");
const deliveries = require("./routes/deliveries");
const ai = require("./routes/ai");
const routing = require("./routes/routing");

function match(path, pattern) {
  const pathParts = path.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);
  if (pathParts.length !== patternParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];
    if (p.startsWith("{") && p.endsWith("}")) {
      params[p.slice(1, -1)] = decodeURIComponent(pathParts[i]);
    } else if (p !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

const ROUTES = [
  ["GET",   "/health",                                   (e,c) => json(200, { status: "ok", service: "mootive-backend", time: new Date().toISOString() })],

  ["POST",  "/users/profile",                            (e,c) => users.createProfile(e, c)],
  ["GET",   "/users/me",                                 (e,c) => users.getMe(e, c)],
  ["PATCH", "/users/me",                                 (e,c) => users.updateMe(e, c)],
  ["GET",   "/users/check",                              (e,c) => users.checkReceiver(e, c)],

  ["POST",  "/drivers/profile",                          (e,c) => drivers.createProfile(e, c)],
  ["GET",   "/drivers/me",                               (e,c) => drivers.getMe(e, c)],
  ["PATCH", "/drivers/availability",                     (e,c) => drivers.updateAvailability(e, c)],
  ["GET",   "/drivers/jobs/open",                        (e,c) => drivers.openJobs(e, c)],
  ["GET",   "/drivers/jobs/accepted",                    (e,c) => drivers.acceptedJobs(e, c)],
  ["POST",  "/drivers/jobs/{deliveryId}/accept",         (e,c) => drivers.acceptJob(e, c)],

  ["POST",  "/deliveries",                               (e,c) => deliveries.create(e, c)],
  ["GET",   "/deliveries/sent",                          (e,c) => deliveries.sent(e, c)],
  ["GET",   "/deliveries/incoming",                      (e,c) => deliveries.incoming(e, c)],
  ["GET",   "/deliveries/{deliveryId}",                  (e,c) => deliveries.get(e, c)],
  ["POST",  "/deliveries/{deliveryId}/analyze",          (e,c) => ai.analyze(e, c)],
  ["POST",  "/deliveries/{deliveryId}/optimize-route",   (e,c) => routing.optimize(e, c)],
  ["POST",  "/deliveries/{deliveryId}/status",           (e,c) => deliveries.updateStatus(e, c)],
  ["GET",   "/deliveries/{deliveryId}/events",           (e,c) => deliveries.events(e, c)],
  ["POST",  "/deliveries/{deliveryId}/confirm",          (e,c) => deliveries.confirm(e, c)],
  ["POST",  "/deliveries/{deliveryId}/report-issue",     (e,c) => deliveries.reportIssue(e, c)],
];

exports.handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod || "GET";
    const rawPath = event.rawPath || event.path || "/";
    const path = rawPath.replace(/\/+$/, "") || "/";

    if (method === "OPTIONS") return noContent();

    const ctx = {
      method,
      path,
      body: parseBody(event),
      qs: parseQuery(event),
      params: {},
    };

    for (const [m, pattern, handler] of ROUTES) {
      if (m !== method) continue;
      const params = match(path, pattern);
      if (params) {
        ctx.params = params;
        return await handler(event, ctx);
      }
    }

    return json(404, { message: "Route not found", method, path });
  } catch (err) {
    console.error("Unhandled Lambda error", err);
    return json(500, { message: "Internal server error", error: err.message });
  }
};
