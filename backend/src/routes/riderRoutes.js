const express = require("express");
const { listRiders } = require("../controllers/riderController");

const router = express.Router();

router.get("/", listRiders);

module.exports = router;
