/**
 * Tiny fetch wrapper for the Mootive backend.
 *
 * Calls go to relative /api/* paths; in dev, Vite proxies them to the Express
 * server on http://localhost:4000 (see vite.config.js). To point at a deployed
 * backend later, set VITE_API_BASE and it will be prefixed instead.
 */

const BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON or empty response — leave data as null.
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  health: () => request("/health"),

  // Auth / users
  login: (profile) => request("/auth/login", { method: "POST", body: profile }),
  listUsers: () => request("/users"),
  findUser: (tag) => request(`/users/${encodeURIComponent(tag)}`),
  incoming: (tag) => request(`/users/${encodeURIComponent(tag)}/incoming`),

  // Riders
  listRiders: () => request("/riders"),

  // Deliveries
  createDelivery: (payload) => request("/deliveries", { method: "POST", body: payload }),
  listDeliveries: (query = "") => request(`/deliveries${query}`),
  getDelivery: (id) => request(`/deliveries/${id}`),
  findRiders: (id) => request(`/deliveries/${id}/riders`),
  selectRider: (id, riderId) =>
    request(`/deliveries/${id}/select-rider`, { method: "POST", body: { riderId } }),
  updateStatus: (id, status) =>
    request(`/deliveries/${id}/status`, { method: "PATCH", body: { status } }),
  confirmDelivery: (id) => request(`/deliveries/${id}/confirm`, { method: "POST" }),
  raiseDispute: (id, reason) =>
    request(`/deliveries/${id}/dispute`, { method: "POST", body: { reason } }),
  getDispute: (id) => request(`/deliveries/${id}/dispute`),
};
