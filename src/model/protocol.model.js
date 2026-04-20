const mongoose = require("mongoose");

const protocolSchema = new mongoose.Schema(
  {
    lot: { type: mongoose.Schema.Types.ObjectId, ref: "Lot", required: false },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    protocolNumber: { type: String, required: true, unique: true },
    finalPrice: { type: Number },
    participantsList: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isManual: { type: Boolean, default: false },
    manualData: {
      lotNumber: String,
      organizer: String,
      auctionType: String,
      basisDocument: String,
      description: String,
      startPrice: Number,
      finalPrice: Number,
      winnerName: String,
      winnerJshshir: String,
      winnerAddress: String,
      startDate: Date,
      attributes: [{ key: String, value: String }],
    },
    images: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Protocol", protocolSchema);
