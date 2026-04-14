const express = require("express");
const router = express.Router();
const { applyForLot, getApplicationsForLot, getUserApplications, checkMyApplication, updateApplicationStatus, deleteApplication } = require("../controller/application.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/apply", protect, applyForLot);
router.get("/lot/:lotId", protect, getApplicationsForLot);
router.get("/my", protect, getUserApplications);
router.get("/check/:lotId", protect, checkMyApplication);
router.put("/:id/status", protect, updateApplicationStatus);
router.delete("/:id", protect, deleteApplication);

module.exports = router;
