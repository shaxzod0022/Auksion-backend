const User = require("../model/user.model");
const bcrypt = require("bcrypt");
const generateToken = require("../util/generateToken");

/* =========================================================
   🟢 REGISTER — Yangi foydalanuvchi ro‘yxatdan o‘tkazish
========================================================= */
const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      jshshir,
      passportSeries,
      passportNumber,
      phoneNumber,
      email,
      password,
      role,
    } = req.body;

    const existUser = await User.findOne({ email });
    if (existUser) {
      return res.status(400).json({ message: "Bu emailga tegishli foydalanuvchi mavjud!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      firstName,
      lastName,
      middleName,
      dateOfBirth: new Date(dateOfBirth),
      jshshir,
      passportSeries,
      passportNumber,
      phoneNumber,
      email,
      password: hashedPassword,
      role: role || "user",
    });

    await newUser.save();
    res.status(201).json({ message: "Foydalanuvchi muvaffaqiyatli ro‘yxatdan o‘tdi ✅" });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🔵 LOGIN — Kirish
========================================================= */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email va parol kiritilishi shart!" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Bunday email mavjud emas!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Parol noto‘g‘ri!" });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: "Tizimga muvaffaqiyatli kirdingiz ✅",
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🟡 GET ME — Login qilgan foydalanuvchi ma'lumotlari
========================================================= */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

/* =========================================================
   🟠 UPDATE — Foydalanuvchi ma'lumotlarini yangilash
========================================================= */
const updateUser = async (req, res) => {
  try {
    const { 
      firstName, lastName, middleName, dateOfBirth, 
      jshshir, passportSeries, passportNumber, 
      phoneNumber, email, oldPassword, newPassword, fullAddress 
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }

    const isAdmin = req.admin && (req.admin.role === "admin" || req.admin.role === "superadmin");

    if (newPassword) {
      if (!isAdmin) {
        if (!oldPassword) {
          return res.status(400).json({ message: "Eski parol kiritilmadi!" });
        }
        const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordCorrect) {
          return res.status(400).json({ message: "Eski parol noto‘g‘ri!" });
        }
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.middleName = middleName || user.middleName;
    user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : user.dateOfBirth;
    user.jshshir = jshshir || user.jshshir;
    user.passportSeries = passportSeries || user.passportSeries;
    user.passportNumber = passportNumber || user.passportNumber;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.email = email || user.email;
    if (fullAddress) user.fullAddress = fullAddress;

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Ma'lumotlar muvaffaqiyatli yangilandi ✅",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🔴 DELETE — O‘chirish
========================================================= */
/* =========================================================
   🟣 GET ALL — Barcha foydalanuvchilarni olish (Admin uchun)
========================================================= */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🧩 EXPORT
========================================================= */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }
    res.status(200).json({ message: "Foydalanuvchi muvaffaqiyatli o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🧩 EXPORT
========================================================= */
module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateUser,
  deleteUser,
  getAllUsers,
};
