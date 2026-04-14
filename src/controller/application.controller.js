const Application = require("../model/application.model");
const Lot = require("../model/lot.model");
const User = require("../model/user.model");

const applyForLot = async (req, res) => {
  try {
    const userId = req.user._id;
    const { lotId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

    // Verify fullAddress and jshshir
    if (!user.jshshir || user.jshshir.length !== 14) {
      return res.status(400).json({ message: "Arizani topshirish uchun JSHSHIR kiritilishi majburiy!" });
    }
    if (!user.fullAddress || !user.fullAddress.region || !user.fullAddress.city || !user.fullAddress.street || !user.fullAddress.houseNumber) {
      return res.status(400).json({ message: "Arizani topshirish uchun to'liq yashash manzili kiritilishi majburiy!" });
    }

    const lot = await Lot.findById(lotId);
    if (!lot) return res.status(404).json({ message: "Lot topilmadi" });

    // Check if user already applied
    const existingApp = await Application.findOne({ user: userId, lot: lotId });
    if (existingApp) {
      return res.status(400).json({ message: "Siz bu lotga allaqachon ariza bergansiz!" });
    }

    const newApp = new Application({ user: userId, lot: lotId });
    await newApp.save();

    res.status(201).json({ message: "Ariza muvaffaqiyatli qabul qilindi", application: newApp });
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

const getApplicationsForLot = async (req, res) => {
  try {
    const { lotId } = req.params;
    const apps = await Application.find({ lot: lotId }).populate("user", "-password");
    res.status(200).json(apps);
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

const getUserApplications = async (req, res) => {
  try {
    const apps = await Application.find({ user: req.user._id }).populate("lot");
    res.status(200).json(apps);
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

const checkMyApplication = async (req, res) => {
  try {
    const app = await Application.findOne({ user: req.user._id, lot: req.params.lotId });
    res.status(200).json(app || { message: "Not found" });
  } catch (err) {
    res.status(500).json({ message: "Server xatosi" });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Ariza topilmadi" });
    app.status = status;
    await app.save();
    res.status(200).json({ message: "Holat yangilandi", application: app });
  } catch (err) {
    res.status(500).json({ message: "Server xatosi" });
  }
};

const deleteApplication = async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Ariza topilmadi" });
    
    await app.deleteOne();
    res.status(200).json({ message: "Ariza bekor qilindi/o'chirildi" });
  } catch (err) {
    res.status(500).json({ message: "Server xatosi" });
  }
};

module.exports = { applyForLot, getApplicationsForLot, getUserApplications, checkMyApplication, updateApplicationStatus, deleteApplication };
