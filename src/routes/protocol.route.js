const express = require("express");
const router = express.Router();
const { createProtocol, getProtocols, getUserProtocols, updateProtocolStatus, downloadProtocolPDF } = require("../controller/protocol.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.post("/", protect, authorize("superadmin", "admin"), createProtocol);
router.get("/", protect, authorize("superadmin", "admin"), getProtocols);
router.get("/my", protect, getUserProtocols);
router.put("/:id", protect, authorize("superadmin", "admin"), updateProtocolStatus);
router.get("/:id/download", downloadProtocolPDF);

module.exports = router;
