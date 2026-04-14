const mongoose = require("mongoose");

const lotTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LotType", lotTypeSchema);
