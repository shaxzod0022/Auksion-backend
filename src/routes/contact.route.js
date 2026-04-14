const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const {
  createContact,
  getAllContacts,
  getContactById,
  deleteContact,
} = require("../controller/contact.controller");

router.post("/", createContact);
router.get("/", protect, getAllContacts);
router.get("/:id", protect, getContactById);
router.delete("/:id", protect, deleteContact);

module.exports = router;
