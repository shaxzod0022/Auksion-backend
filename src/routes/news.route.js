const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const {
  createData,
  getAllData,
  getLatestTen,
  updateData,
  deleteData,
  getBySlugData,
} = require("../controller/news.controller");

router.post("/", protect, createData);
router.get("/", getAllData);
router.get("/latest", getLatestTen);
router.get("/slug/:slug", getBySlugData);
router.put("/:id", protect, updateData);
router.delete("/:id", protect, deleteData);

module.exports = router;
