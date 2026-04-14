const Province = require("../model/province.model");

/* =========================================================
   🟢 CREATE — Yangi viloyat qo'shish
========================================================= */
const createProvince = async (req, res) => {
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

    const newProvince = new Province({ name, slug });
    await newProvince.save();

    res.status(201).json({ message: "Viloyat muvaffaqiyatli qo'shildi ✅", data: newProvince });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🟡 READ — Barcha viloyatlarni olish
========================================================= */
const getAllProvinces = async (req, res) => {
  try {
    const provinces = await Province.find().sort({ name: 1 });
    res.json(provinces);
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🔵 UPDATE — Tahrirlash
========================================================= */
const updateProvince = async (req, res) => {
  try {
    const { name } = req.body;
    const province = await Province.findById(req.params.id);
    if (!province) {
      return res.status(404).json({ message: "Viloyat topilmadi!" });
    }

    if (name) {
      province.name = name;
      province.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    await province.save();
    res.json({ message: "Viloyat muvaffaqiyatli yangilandi ✅", data: province });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🔴 DELETE — O'chirish
========================================================= */
const deleteProvince = async (req, res) => {
  try {
    const province = await Province.findByIdAndDelete(req.params.id);
    if (!province) {
      return res.status(404).json({ message: "Viloyat topilmadi!" });
    }
    res.json({ message: "Viloyat muvaffaqiyatli o'chirildi!" });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

module.exports = {
  createProvince,
  getAllProvinces,
  updateProvince,
  deleteProvince,
};
