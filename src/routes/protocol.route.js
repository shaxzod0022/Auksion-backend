const express = require("express");
const router = express.Router();
const { createProtocol, createManualProtocol, getProtocols, getUserProtocols, updateProtocolStatus, updateProtocol, downloadProtocolPDF, deleteProtocol } = require("../controller/protocol.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.post("/", protect, authorize("superadmin", "admin"), createProtocol);
router.post("/manual", protect, authorize("superadmin", "admin"), createManualProtocol);
router.get("/", protect, authorize("superadmin", "admin"), getProtocols);
router.get("/my", protect, getUserProtocols);
router.put("/:id", protect, authorize("superadmin", "admin"), updateProtocol);
router.delete("/:id", protect, authorize("superadmin", "admin"), deleteProtocol);
router.get("/:id/download", downloadProtocolPDF);


module.exports = router;
