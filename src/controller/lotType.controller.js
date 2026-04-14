const fs = require("fs");
const path = require("path");
const LotType = require("../model/lotType.model");
const fileService = require("../service/file.service");

const uploadPath = path.join(__dirname, "..", "upload");

/* =========================================================
   🟢 CREATE — Yangi kategoriya qo‘shish
========================================================= */
const createData = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Nomi kiritilishi shart!" });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newData = new LotType({
      name,
      slug,
    });

    const savedData = await newData.save();

    res.status(201).json({
      message: "Savdo shakli muvaffaqiyatli qo‘shildi ✅",
      data: savedData,
    });
  } catch (err) {
    res.status(500).json({
      message: "Serverda xatolik yuz berdi!",
      error: err.message,
    });
  }
};

/* =========================================================
   🟡 READ — Barcha kategoriyalarni olish
========================================================= */
const getAllData = async (req, res) => {
  try {
    const categories = await LotType.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🟠 READ BY SLUG — Slug orqali ma'lumot olish
========================================================= */
const getBySlugData = async (req, res) => {
  try {
    const { slug } = req.params;
    const foundLotType = await LotType.findOne({ slug });

    if (!foundLotType) {
      return res.status(404).json({ message: "Savdo shakli topilmadi!" });
    }

    res.json(foundLotType);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🔵 UPDATE — Tahrirlash
========================================================= */
const updateData = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const foundLotType = await LotType.findById(id);
    if (!foundLotType) {
      return res.status(404).json({ message: "Savdo shakli topilmadi!" });
    }

    if (name) {
      foundLotType.name = name;
      foundLotType.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    const updated = await foundLotType.save();

    res.status(200).json({
      message: "Savdo shakli muvaffaqiyatli yangilandi ✅",
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ message: "Serverda xatolik!", error: err.message });
  }
};

/* =========================================================
   🔴 DELETE — O‘chirish
========================================================= */
const deleteData = async (req, res) => {
  try {
    const foundLotType = await LotType.findById(req.params.id);
    if (!foundLotType) {
      return res.status(404).json({ message: "Savdo shakli topilmadi!" });
    }

    await LotType.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Savdo shakli muvaffaqiyatli o‘chirildi!" });
  } catch (err) {
    res.status(500).json({ message: "Serverda xatolik!", error: err.message });
  }
};

/* =========================================================
   🧩 EXPORT
========================================================= */
module.exports = {
  createData,
  getAllData,
  getBySlugData,
  updateData,
  deleteData,
};
