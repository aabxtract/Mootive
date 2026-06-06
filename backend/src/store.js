/**
 * Persistent JSON-file store for the Mootive MVP.
 *
 * State is held in memory for fast access and mirrored to a JSON file on disk
 * (`backend/db.json` by default, override with DB_FILE) so it survives process
 * restarts — important once the app is deployed and judges can revisit the link
 * anytime, including after the host has slept/restarted the server.
 *
 * Design goals:
 *  - No external database, no new dependencies (uses Node's built-in fs).
 *  - Riders + seed users are ALWAYS present, even on a brand-new container or a
 *    corrupted file, so the deployed link never shows up empty.
 *  - Saves are explicit (controllers call save() after a mutation) and cheap.
 */

const fs = require("fs");
const path = require("path");
const { users: seedUsers, riders: seedRiders } = require("./data/seed");

const DB_FILE = process.env.DB_FILE || path.join(__dirname, "..", "db.json");

// In-memory working copy.
const db = {
  users: [],
  riders: [],
  deliveries: [],
};

// Incrementing id generators. Persisted so ids never collide across restarts.
const counters = { user: 0, delivery: 0, dispute: 0 };

function freshSeed() {
  db.users = seedUsers.map((u) => ({ ...u }));
  db.riders = seedRiders.map((r) => ({ ...r }));
  db.deliveries = [];
  counters.user = seedUsers.length;
  counters.delivery = 0;
  counters.dispute = 0;
}

function save() {
  try {
    const payload = JSON.stringify({ ...db, counters }, null, 2);
    fs.writeFileSync(DB_FILE, payload);
  } catch (err) {
    // Never let a failed write crash a request — log and continue in memory.
    // (Some hosts have read-only/ephemeral disks; the app still works.)
    console.error("⚠️  Could not persist db.json:", err.message);
  }
}

function load() {
  let loaded = null;
  try {
    if (fs.existsSync(DB_FILE)) {
      loaded = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("⚠️  db.json unreadable, re-seeding fresh:", err.message);
  }

  if (!loaded || !Array.isArray(loaded.users)) {
    freshSeed();
    save();
    console.log("🌱  Seeded fresh data store.");
    return;
  }

  db.users = loaded.users;
  db.deliveries = Array.isArray(loaded.deliveries) ? loaded.deliveries : [];

  // Riders are config, not user data — always guarantee the full seed set is
  // present so the demo never loses its rider pool.
  db.riders =
    Array.isArray(loaded.riders) && loaded.riders.length
      ? loaded.riders
      : seedRiders.map((r) => ({ ...r }));

  // Restore counters; fall back to derived maxima so ids stay unique even if an
  // older file lacks them.
  const saved = loaded.counters || {};
  counters.user = saved.user || db.users.length;
  counters.delivery = saved.delivery || db.deliveries.length;
  counters.dispute =
    saved.dispute || db.deliveries.filter((d) => d.dispute).length;

  console.log(
    `📦  Loaded store: ${db.users.length} users, ${db.riders.length} riders, ${db.deliveries.length} deliveries.`
  );
}

load();

function nextId(kind, prefix) {
  counters[kind] += 1;
  return `${prefix}_${String(counters[kind]).padStart(3, "0")}`;
}

// ---- Users -----------------------------------------------------------------

function getUsers() {
  return db.users;
}

function findUserById(id) {
  return db.users.find((u) => u.id === id) || null;
}

/**
 * Look up a user by any of the identifiers a sender might type:
 * receiver tag (@handle), username, or phone number.
 */
function findUserByTag(tag) {
  if (!tag) return null;
  const needle = String(tag).trim().toLowerCase();
  const bare = needle.replace(/^@/, "");
  return (
    db.users.find(
      (u) =>
        (u.receiverTag && u.receiverTag.toLowerCase() === needle) ||
        (u.username && u.username.toLowerCase() === bare) ||
        (u.phone && u.phone === bare)
    ) || null
  );
}

function createUser({ name, phone, username }) {
  const id = nextId("user", "user");
  const handle = username || (name ? name.split(" ")[0].toLowerCase() : id);
  const user = {
    id,
    name: name || "Guest",
    phone: phone || "",
    username: handle,
    receiverTag: `@${handle}`,
    role: "both",
  };
  db.users.push(user);
  save();
  return user;
}

// ---- Riders ----------------------------------------------------------------

function getRiders() {
  return db.riders;
}

function findRiderById(id) {
  return db.riders.find((r) => r.id === id) || null;
}

// ---- Deliveries ------------------------------------------------------------

function getDeliveries() {
  return db.deliveries;
}

function findDeliveryById(id) {
  return db.deliveries.find((d) => d.id === id) || null;
}

function addDelivery(delivery) {
  db.deliveries.push(delivery);
  save();
  return delivery;
}

function newDeliveryId() {
  return nextId("delivery", "delivery");
}

function newDisputeId() {
  return nextId("dispute", "ticket");
}

module.exports = {
  db,
  save,
  getUsers,
  findUserById,
  findUserByTag,
  createUser,
  getRiders,
  findRiderById,
  getDeliveries,
  findDeliveryById,
  addDelivery,
  newDeliveryId,
  newDisputeId,
};
