const store = require("../store");

/**
 * Fake login / profile entry.
 * If a user with the same phone or username already exists, return them;
 * otherwise create a lightweight profile. No passwords, no real auth — this
 * just gives the rest of the app a stable user identity.
 *
 * POST /api/auth/login  { name, phone, username }
 */
function login(req, res) {
  const { name, phone, username } = req.body || {};

  if (!name && !phone && !username) {
    return res
      .status(400)
      .json({ error: "Provide at least a name, phone, or username." });
  }

  let user =
    store.findUserByTag(username) ||
    store.findUserByTag(phone) ||
    null;

  let created = false;
  if (!user) {
    user = store.createUser({ name, phone, username });
    created = true;
  }

  res.status(created ? 201 : 200).json({ user, created });
}

module.exports = { login };
