const express = require("express");
const ctrl = require("../controllers/deliveryController");

const router = express.Router();

router.post("/", ctrl.createDelivery);
router.get("/", ctrl.listDeliveries);
router.get("/:id", ctrl.getDelivery);

router.get("/:id/riders", ctrl.findRiders);
router.post("/:id/select-rider", ctrl.selectRider);
router.patch("/:id/status", ctrl.updateStatus);
router.post("/:id/confirm", ctrl.confirmDelivery);

router.post("/:id/dispute", ctrl.raiseDispute);
router.get("/:id/dispute", ctrl.getDispute);

module.exports = router;
