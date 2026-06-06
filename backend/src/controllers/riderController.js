const store = require("../store");
const { scoreRiders } = require("../utils/recommendation");

/**
 * GET /api/riders
 * List all riders. Optionally scored (?scored=true) for inspection.
 */
function listRiders(req, res) {
  const riders = store.getRiders();
  if (String(req.query.scored) === "true") {
    return res.json({ riders: scoreRiders(riders) });
  }
  res.json({ riders });
}

module.exports = { listRiders };
