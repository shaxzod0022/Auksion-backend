const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const {
  createData,
  getAllData,
  updateData,
  deleteData,
  getBySlugData,
} = require("../controller/lotType.controller");

router.post("/", protect, createData);
router.get("/", getAllData);
router.get("/slug/:slug", getBySlugData);
router.put("/:id", protect, updateData);
router.delete("/:id", protect, deleteData);

module.exports = router;
