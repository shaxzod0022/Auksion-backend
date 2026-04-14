const mongoose = require("mongoose");

const provinceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Province", provinceSchema);
