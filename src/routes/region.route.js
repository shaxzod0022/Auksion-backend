const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const {
  createRegion,
  getAllRegions,
  getRegionsByProvince,
  updateRegion,
  deleteRegion,
} = require("../controller/region.controller");

router.get("/", getAllRegions);
router.get("/province/:provinceId", getRegionsByProvince);
router.post("/", protect, createRegion);
router.put("/:id", protect, updateRegion);
router.delete("/:id", protect, deleteRegion);

module.exports = router;
