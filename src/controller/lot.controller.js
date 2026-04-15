const fs = require("fs");
const path = require("path");
const Lot = require("../model/lot.model");
const Category = require("../model/category.model");
const fileService = require("../service/file.service");

const LotType = require("../model/lotType.model");

const uploadPath = path.join(__dirname, "..", "upload");

/* =========================================================
   🟢 8-xonali noyob lotNumber yaratish
========================================================= */
const generateLotNumber = async () => {
  let isUnique = false;
  let number;
  while (!isUnique) {
    number = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 xonali
    const existing = await Lot.findOne({ lotNumber: number });
    if (!existing) isUnique = true;
  }
  return number;
};

/* =========================================================
   🟢 CREATE — Yangi lot qo‘shish
========================================================= */
const createData = async (req, res) => {
  try {
    const {
      name,
      lotType,
      category,
      startPrice,
      startDate,
      endDate,
      salesVolume,
      description,
      province,
      region,
      address,
      phone1,
      phone2,
      customer,
      style,
      formTrade,
      firstStep,
      consultationPrice,
      consultingPrice,
      status,
    } = req.body;

    if (!name || !lotType || !category) {
      return res.status(400).json({ message: "Majburiy maydonlar kiritilishi shart!" });
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
    }

    const generatedLotNumber = await generateLotNumber();

    const newData = new Lot({
      name,
      slug,
      image,
      lotNumber: generatedLotNumber,
      lotType,
      category,
      startPrice: Number(startPrice),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      salesVolume: Number(salesVolume),
      description,
      province,
      region,
      address,
      phone1,
      phone2,
      customer,
      style,
      formTrade,
      firstStep: Number(firstStep),
      consultationPrice: Number(consultationPrice),
      consultingPrice: Number(consultingPrice),
      status: status || "active",
    });

    const savedData = await newData.save();

    res.status(201).json({
      message: "Lot muvaffaqiyatli qo‘shildi ✅",
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
   🟡 READ — Barcha lotlarni olish
========================================================= */
const getAllData = async (req, res) => {
  try {
    const { category, lotType, status, name, province, region, page, limit = 12 } = req.query;
    const filter = {};

    if (category) {
      // Agar katekoriya slug bo'lsa, uning ID sini topamiz
      const foundCategory = await Category.findOne({ slug: category });
      if (foundCategory) {
        filter.category = foundCategory._id;
      } else if (category.match(/^[0-9a-fA-F]{24}$/)) {
        // Agar katekoriya ID bo'lsa (Admin panel uchun)
        filter.category = category;
      }
    }

    if (lotType) {
      // Agar lotType slug bo'lsa, uning ID sini topamiz
      const foundLotType = await LotType.findOne({ slug: lotType });
      if (foundLotType) {
        filter.lotType = foundLotType._id;
      } else if (lotType.match(/^[0-9a-fA-F]{24}$/)) {
        // Agar lotType ID bo'lsa
        filter.lotType = lotType;
      }
    }

    if (status) {
      filter.status = status;
    } else if (req.query.all !== "true") {
      // DEFAULT FILTER: faqat faol va muddati o'tmagan lotlar
      filter.status = "active";
      filter.endDate = { $gt: new Date() };
    }

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (province) filter.province = province;
    if (region) filter.region = region;

    // Admin panel uchun pagination bo'lmasa, hammasini qaytaramiz
    if (!page) {
      const lots = await Lot.find(filter)
        .populate("category")
        .populate("lotType")
        .populate("province")
        .populate("region")
        .sort({ createdAt: -1 });
      return res.json(lots);
    }

    const currentPage = parseInt(page);
    const currentLimit = parseInt(limit);
    const skip = (currentPage - 1) * currentLimit;

    const totalLots = await Lot.countDocuments(filter);
    const totalPages = Math.ceil(totalLots / currentLimit);

    const lots = await Lot.find(filter)
      .populate("category")
      .populate("lotType")
      .populate("province")
      .populate("region")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit);

    res.json({
      data: lots,
      pagination: {
        totalLots,
        totalPages,
        currentPage,
        limit: currentLimit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🟠 READ — Eng oxirgi 12 ta lotni olish
========================================================= */
const getLatestLots = async (req, res) => {
  try {
    const now = new Date();
    const lots = await Lot.find({
      status: "active",
      endDate: { $gt: now },
    })
      .populate("category")
      .populate("lotType")
      .populate("province")
      .populate("region")
      .sort({ createdAt: -1 })
      .limit(12);

    res.json(lots);
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
    const lot = await Lot.findOneAndUpdate(
      { slug },
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("category")
      .populate("lotType")
      .populate("province")
      .populate("region");

    if (!lot) {
      return res.status(404).json({ message: "Lot topilmadi!" });
    }

    res.json(lot);
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
    const lot = await Lot.findById(id);

    if (!lot) {
      return res.status(404).json({ message: "Lot topilmadi!" });
    }

    const fieldsToUpdate = [
      "name", "lotNumber", "lotType", "category", "startPrice", 
      "startDate", "endDate", "salesVolume", "description",
      "province", "region", "address", "phone1", "phone2", 
      "customer", "style", "formTrade", "firstStep", "consultationPrice", "consultingPrice", "status"
    ];

    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        if (["startPrice", "salesVolume", "firstStep", "consultationPrice", "consultingPrice"].includes(field)) {
          lot[field] = Number(req.body[field]);
        } else if (["startDate", "endDate"].includes(field)) {
          lot[field] = new Date(req.body[field]);
        } else {
          lot[field] = req.body[field];
        }
      }
    });

    if (req.body.name) {
      lot.slug = req.body.name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    if (req.files && req.files.image) {
      if (lot.image) {
        const oldImagePath = path.join(uploadPath, lot.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      lot.image = fileService.save(req.files.image);
    }

    const updatedData = await lot.save();

    res.status(200).json({
      message: "Lot muvaffaqiyatli yangilandi ✅",
      data: updatedData,
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
    const lot = await Lot.findById(req.params.id);
    if (!lot) {
      return res.status(404).json({ message: "Lot topilmadi!" });
    }

    if (lot.image) {
      const imagePath = path.join(uploadPath, lot.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Lot.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Lot muvaffaqiyatli o‘chirildi!" });
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
  getLatestLots,
  getBySlugData,
  updateData,
  deleteData,
};
