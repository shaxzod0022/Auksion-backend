const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    direction: { type: String, required: true },
    topic: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Contact", contactSchema);
