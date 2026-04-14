const fs = require("fs");
const path = require("path");
const Category = require("../model/category.model");
const Lot = require("../model/lot.model");
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

    let image = "";
    if (req.files && req.files.image) {
      image = fileService.save(req.files.image);
    } else {
      return res.status(400).json({ message: "Rasm yuklanishi majburiy!" });
    }

    const newData = new Category({
      name,
      slug,
      image,
    });

    const savedData = await newData.save();

    res.status(201).json({
      message: "Kategoriya muvaffaqiyatli qo‘shildi ✅",
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
    const categories = await Category.find().sort({ createdAt: -1 });
    
    // Har bir kategoriya uchun lotlar sonini hisoblash
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Lot.countDocuments({ category: cat._id });
        return {
          ...cat._doc,
          count,
        };
      })
    );

    res.json(categoriesWithCount);
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🟠 READ BY SLUG — Slug orqali ma'lumot olish
========================================================= */
const getBySlugData = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug });

    if (!category) {
      return res.status(404).json({ message: "Kategoriya topilmadi!" });
    }

    res.json(category);
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

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Kategoriya topilmadi!" });
    }

    if (name) {
      category.name = name;
      category.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    let image = category.image;

    if (req.files && req.files.image) {
      // Eski rasmni o'chirish
      if (category.image) {
        const oldImagePath = path.join(uploadPath, category.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      image = fileService.save(req.files.image);
    }

    category.image = image;

    const updated = await category.save();

    res.status(200).json({
      message: "Kategoriya muvaffaqiyatli yangilandi ✅",
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
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Kategoriya topilmadi!" });
    }

    if (category.image) {
      const imagePath = path.join(uploadPath, category.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Kategoriya muvaffaqiyatli o‘chirildi!" });
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
