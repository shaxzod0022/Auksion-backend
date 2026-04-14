const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    image: { type: String },
    shortDescription: { type: String, required: true },
    longDescription: { type: String, required: true },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("News", newsSchema);
