const Admin = require("../model/admin.model");
const User = require("../model/user.model");
const Lot = require("../model/lot.model");
const Category = require("../model/category.model");
const LotType = require("../model/lotType.model");
const News = require("../model/news.model");
const Contact = require("../model/contact.model");
const bcrypt = require("bcrypt");
const generateToken = require("../util/generateToken");

const createAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const existAdmin = await Admin.findOne({ email });
    if (existAdmin) {
      return res
        .status(400)
        .json({ message: "Bu emailga tegishli foydalanuvchi mavjud!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new Admin({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: req.body.role || "admin",
    });
    await user.save();
    res.status(201).json({ message: "Admin muvaffaqiyatli yaratildi" });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi!", error: error.message });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔹 1. Email va parol kiritilganligini tekshirish
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email va parol kiritilishi shart!" });
    }

    // 🔹 2. Foydalanuvchini topish
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Bunday email mavjud emas!" });
    }

    // 🔹 3. Parolni solishtirish
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Parol noto‘g‘ri!" });
    }

    // 🔹 4. Token generatsiya qilish
    const token = generateToken(admin);

    // 🔹 5. Javob qaytarish
    res.status(200).json({
      message: "Tizimga muvaffaqiyatli kirdingiz ✅",
      token,
      user: {
        _id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        email: admin.email,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Serverda xatolik!", error: error.message });
  }
};

const getAdmin = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email }).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Admin topilmadi" });
    }
    res.status(201).json({ admin });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, oldPassword, newPassword } = req.body;

    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin topilmadi" });
    }

    // Eski parolni tekshirish
    const isPasswordCorrect = await bcrypt.compare(oldPassword, admin.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Eski parol noto‘g‘ri!" });
    }

    // Yangi parol bo‘lsa, hashlaymiz
    let updatedFields = { firstName, lastName, email };

    // Faqat superadmin rol o'zgartira oladi
    if (req.body.role && req.admin.role === "superadmin") {
      updatedFields.role = req.body.role;
    }

    if (newPassword && newPassword.trim() !== "") {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updatedFields.password = hashedPassword;
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      updatedFields,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      message: "Admin ma'lumotlari muvaffaqiyatli yangilandi",
      ...updatedAdmin.toObject(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    if (!req.admin || !req.admin._id) {
      return res.status(401).json({ message: "Avtorizatsiyadan o'tilmagan!" });
    }

    if (req.params.id === req.admin._id.toString()) {
      return res
        .status(400)
        .json({ message: "O'z-o'zingizni o'chirib yubora olmaysiz!" });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: "Admin topilmadi" });
    }
    res.status(200).json({ message: "Admin muvaffaqiyatli o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password");
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [
      adminCount,
      userCount,
      lotCount,
      categoryCount,
      lotTypeCount,
      newsCount,
      contactCount,
    ] = await Promise.all([
      Admin.countDocuments(),
      User.countDocuments(),
      Lot.countDocuments(),
      Category.countDocuments(),
      LotType.countDocuments(),
      News.countDocuments(),
      Contact.countDocuments(),
    ]);

    res.status(200).json({
      admins: adminCount,
      users: userCount,
      lots: lotCount,
      categories: categoryCount,
      lotTypes: lotTypeCount,
      news: newsCount,
      contacts: contactCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

module.exports = {
  createAdmin,
  loginAdmin,
  getAdmin,
  updateAdmin,
  deleteAdmin,
  getAllAdmins,
  getDashboardStats,
};
