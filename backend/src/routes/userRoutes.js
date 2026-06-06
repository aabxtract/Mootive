const express = require("express");
const { listUsers, getUser, incomingDeliveries } = require("../controllers/userController");

const router = express.Router();

router.get("/", listUsers);
router.get("/:tag/incoming", incomingDeliveries);
router.get("/:tag", getUser);

module.exports = router;
