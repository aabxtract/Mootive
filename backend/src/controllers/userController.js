const store = require("../store");

/**
 * GET /api/users
 * List all known users (handy for demoing receiver tags).
 */
function listUsers(_req, res) {
  res.json({ users: store.getUsers() });
}

/**
 * GET /api/users/:tag
 * Look up a single user by receiver tag, username, or phone.
 * Used by the sender flow to detect whether a receiver exists in the registry.
 */
function getUser(req, res) {
  const user = store.findUserByTag(req.params.tag);
  if (!user) {
    return res.status(404).json({ found: false, error: "Receiver not found" });
  }
  res.json({ found: true, user });
}

/**
 * GET /api/users/:tag/incoming
 * Receiver inbox — deliveries addressed to this user (by id or receiver tag).
 */
function incomingDeliveries(req, res) {
  const user = store.findUserByTag(req.params.tag);
  const tag = req.params.tag;

  const deliveries = store.getDeliveries().filter((d) => {
    if (user && d.receiverId === user.id) return true;
    const t = String(tag).trim().toLowerCase();
    return (
      (d.receiverTag && d.receiverTag.toLowerCase() === t) ||
      (d.receiverTag && d.receiverTag.toLowerCase() === `@${t.replace(/^@/, "")}`)
    );
  });

  res.json({ count: deliveries.length, deliveries });
}

module.exports = { listUsers, getUser, incomingDeliveries };
