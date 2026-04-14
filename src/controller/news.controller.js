const fs = require("fs");
const path = require("path");
const News = require("../model/news.model");
const fileService = require("../service/file.service");

const uploadPath = path.join(__dirname, "..", "upload");

/* =========================================================
   🟢 CREATE — Yangi yangilik qo‘shish
========================================================= */
const createData = async (req, res) => {
  try {
    const { name, shortDescription, longDescription } = req.body;

    if (!name || !shortDescription || !longDescription) {
      return res.status(400).json({ message: "Barcha maydonlar to‘ldirilishi shart!" });
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

    const newData = new News({
      name,
      slug,
      image,
      shortDescription,
      longDescription,
    });

    const savedData = await newData.save();

    res.status(201).json({
      message: "Yangilik muvaffaqiyatli qo‘shildi ✅",
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
   🟡 READ — Barcha yangiliklarni olish
========================================================= */
const getAllData = async (req, res) => {
  try {
    const { page, limit = 12 } = req.query;

    if (!page) {
      const newsList = await News.find().sort({ createdAt: -1 });
      return res.json(newsList);
    }

    const currentPage = parseInt(page);
    const currentLimit = parseInt(limit);
    const skip = (currentPage - 1) * currentLimit;

    const totalNews = await News.countDocuments();
    const totalPages = Math.ceil(totalNews / currentLimit);

    const newsList = await News.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit);

    res.json({
      news: newsList,
      totalPages,
      currentPage,
      totalNews,
    });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🟠 READ — Eng oxirgi 10 ta yangilikni olish
========================================================= */
const getLatestTen = async (req, res) => {
  try {
    const newsList = await News.find().sort({ createdAt: -1 }).limit(10);
    res.json(newsList);
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
    const news = await News.findOneAndUpdate(
      { slug },
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!news) {
      return res.status(404).json({ message: "Yangilik topilmadi!" });
    }

    res.json(news);
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🔵 UPDATE — Tahrirlash
========================================================= */
const updateData = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, shortDescription, longDescription } = req.body;

    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ message: "Yangilik topilmadi!" });
    }

    if (name) {
      news.name = name;
      news.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    if (shortDescription) news.shortDescription = shortDescription;
    if (longDescription) news.longDescription = longDescription;

    if (req.files && req.files.image) {
      if (news.image) {
        const oldImagePath = path.join(uploadPath, news.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      news.image = fileService.save(req.files.image);
    }

    const updated = await news.save();

    res.status(200).json({
      message: "Yangilik muvaffaqiyatli yangilandi ✅",
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
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: "Yangilik topilmadi!" });
    }

    if (news.image) {
      const imagePath = path.join(uploadPath, news.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await News.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Yangilik muvaffaqiyatli o‘chirildi!" });
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
  getLatestTen,
  getBySlugData,
  updateData,
  deleteData,
};
