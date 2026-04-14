const Region = require("../model/region.model");

/* =========================================================
   🟢 CREATE — Yangi tuman/shahar qo'shish
========================================================= */
const createRegion = async (req, res) => {
  try {
    const { name, province } = req.body;
    if (!name || !province) {
      return res.status(400).json({ message: "Nomi va viloyati kiritilishi shart!" });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newRegion = new Region({ name, slug, province });
    await newRegion.save();

    res.status(201).json({ message: "Tuman muvaffaqiyatli qo'shildi ✅", data: newRegion });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🟡 READ — Barcha tumanlarni olish
========================================================= */
const getAllRegions = async (req, res) => {
  try {
    const regions = await Region.find().populate("province").sort({ name: 1 });
    res.json(regions);
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🟡 READ BY PROVINCE — Viloyat bo'yicha tumanlarni olish
========================================================= */
const getRegionsByProvince = async (req, res) => {
  try {
    const regions = await Region.find({ province: req.params.provinceId }).sort({ name: 1 });
    res.json(regions);
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🔵 UPDATE — Tahrirlash
========================================================= */
const updateRegion = async (req, res) => {
  try {
    const { name, province } = req.body;
    const region = await Region.findById(req.params.id);
    if (!region) {
      return res.status(404).json({ message: "Tuman topilmadi!" });
    }

    if (name) {
      region.name = name;
      region.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
    if (province) region.province = province;

    await region.save();
    res.json({ message: "Tuman muvaffaqiyatli yangilandi ✅", data: region });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🔴 DELETE — O'chirish
========================================================= */
const deleteRegion = async (req, res) => {
  try {
    const region = await Region.findByIdAndDelete(req.params.id);
    if (!region) {
      return res.status(404).json({ message: "Tuman topilmadi!" });
    }
    res.json({ message: "Tuman muvaffaqiyatli o'chirildi!" });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

module.exports = {
  createRegion,
  getAllRegions,
  getRegionsByProvince,
  updateRegion,
  deleteRegion,
};
