const crypto = require("crypto");
const bcrypt = require("bcrypt");
const Admin = require("../model/admin.model");
const sendEmailPage = require("../util/sendEmailCode");

// 🔹 1. Parolni tiklash uchun email yuborish
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ message: "Bunday email topilmadi!" });
    }

    // Token yaratish
    const resetToken = crypto.randomBytes(20).toString("hex");

    admin.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    admin.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 daqiqa

    await admin.save({ validateBeforeSave: false });

    // Frontend havolasi
    const resetUrl = `${process.env.FRONTEND_URL}/my-admin-panel/reset-password/${resetToken}`;

    const message = `
      <h2>Salom, ${admin.firstName}!</h2>
      <p>Parolingizni tiklash uchun quyidagi havolaga kiring:</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>Ushbu havola 15 daqiqa amal qiladi.</p>
    `;

    await sendEmailPage({
      to: admin.email,
      subject: "Parolni tiklash so‘rovi",
      html: message,
    });

    res.status(200).json({
      success: true,
      message: "Parolni tiklash havolasi email orqali yuborildi.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// 🔹 2. Token orqali yangi parol o‘rnatish
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const admin = await Admin.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!admin) {
      return res
        .status(400)
        .json({ message: "Token noto‘g‘ri yoki muddati o‘tgan!" });
    }

    if (!password || password.trim() === "") {
      return res
        .status(400)
        .json({ message: "Yangi parol kiritilishi kerak!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    admin.password = hashedPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Parol muvaffaqiyatli tiklandi. Endi qayta tizimga kiring.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

module.exports = { forgotPassword, resetPassword };
