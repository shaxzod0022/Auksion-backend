const express = require("express");
const {
  createAdmin,
  loginAdmin,
  getAdmin,
  updateAdmin,
  deleteAdmin,
  getAllAdmins,
  getDashboardStats,
} = require("../controller/admin.controller");
const { protect, authorize } = require("../middleware/auth.middleware");
const {
  forgotPassword,
  resetPassword,
} = require("../controller/auth.controller");
const router = express.Router();

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/", protect, authorize("superadmin"), getAllAdmins);
router.post("/", protect, authorize("superadmin"), createAdmin);
router.get("/dashboard/stats", protect, getDashboardStats);
router.post("/login", loginAdmin);
router.put("/:id", protect, updateAdmin);
router.delete("/:id", protect, authorize("superadmin"), deleteAdmin);
router.post("/verify-token", protect, (req, res) => {
  res.status(200).json({ isValid: true, user: req.admin });
});

module.exports = router;
