const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    jshshir: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v) {
          return /^\d{14}$/.test(v);
        },
        message: props => `${props.value} haqiqiy JSHSHIR emas! 14 ta raqam bo'lishi kerak.`
      }
    },
    passportSeries: { type: String, required: true },
    passportNumber: { type: String, required: true },
    fullAddress: {
      region: { type: String, required: true },
      city: { type: String, required: true },
      street: { type: String, required: true },
      houseNumber: { type: String, required: true }
    },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
