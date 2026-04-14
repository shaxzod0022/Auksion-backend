const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("MongoDB ga ulanish muvaffaqiyatli!");
  } catch (error) {
    console.error("MongoDB ga ulanishda xatolik:", error.message);
  }
};

module.exports = connectDB;
