const mongoose = require("mongoose");

const protocolSchema = new mongoose.Schema(
  {
    lot: { type: mongoose.Schema.Types.ObjectId, ref: "Lot", required: true },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    protocolNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Protocol", protocolSchema);
