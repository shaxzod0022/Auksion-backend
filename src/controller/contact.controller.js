const Contact = require("../model/contact.model");

/* =========================================================
   🟢 CREATE — Yangi xabar yuborish
========================================================= */
const createContact = async (req, res) => {
  try {
    const { direction, topic, fullName, email, phoneNumber, message } = req.body;

    if (!direction || !topic || !fullName || !email || !phoneNumber || !message) {
      return res.status(400).json({ message: "Barcha maydonlar to‘ldirilishi shart!" });
    }

    const newContact = new Contact({
      direction,
      topic,
      fullName,
      email,
      phoneNumber,
      message,
    });

    await newContact.save();
    res.status(201).json({ message: "Xabaringiz muvaffaqiyatli yuborildi ✅" });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🟡 READ ALL — Barcha xabarlarni ko‘rish (Admin uchun)
========================================================= */
const getAllContacts = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(403).json({ message: "Ruxsat yo‘q! Faqat adminlar ko‘ra oladi." });
    }

    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🟠 READ BY ID — ID orqali ko‘rish (Admin uchun)
========================================================= */
const getContactById = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(403).json({ message: "Ruxsat yo‘q! Faqat adminlar ko‘ra oladi." });
    }

    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: "Xabar topilmadi!" });
    }

    res.json(contact);
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🔴 DELETE — O‘chirish (Admin uchun)
========================================================= */
const deleteContact = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(403).json({ message: "Ruxsat yo‘q! Faqat adminlar o‘chira oladi." });
    }

    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: "Xabar topilmadi!" });
    }

    res.status(200).json({ message: "Xabar muvaffaqiyatli o‘chirildi!" });
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik!", error: error.message });
  }
};

/* =========================================================
   🧩 EXPORT
========================================================= */
module.exports = {
  createContact,
  getAllContacts,
  getContactById,
  deleteContact,
};
