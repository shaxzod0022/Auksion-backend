const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const {
  createProvince,
  getAllProvinces,
  updateProvince,
  deleteProvince,
} = require("../controller/province.controller");

router.get("/", getAllProvinces);
router.post("/", protect, createProvince);
router.put("/:id", protect, updateProvince);
router.delete("/:id", protect, deleteProvince);

module.exports = router;
