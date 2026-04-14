const mongoose = require("mongoose");

const lotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    image: { type: String },
    lotNumber: { type: String, unique: true, required: true },
    lotType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LotType",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    startPrice: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: { type: String, required: true },
    salesVolume: { type: Number, required: true },
    description: { type: String, required: true },

    province: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Province",
      required: true,
    },
    region: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Region",
      required: true,
    },
    address: { type: String },
    phone1: { type: String, required: true },
    phone2: { type: String },
    customer: { type: String, required: true },
    style: { type: String, required: true },
    formTrade: { type: String, required: true },
    firstStep: { type: Number, required: true },
    consultationPrice: { type: Number, required: true },
    status: { type: String, enum: ["active", "inactive", "successful", "unsuccessful"], default: "active" },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Lot", lotSchema);
