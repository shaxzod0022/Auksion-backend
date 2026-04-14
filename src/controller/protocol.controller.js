const Protocol = require("../model/protocol.model");
const Lot = require("../model/lot.model");
const User = require("../model/user.model");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

const createProtocol = async (req, res) => {
  try {
    const { lotId, winnerId } = req.body;
    
    // Create random protocol number
    const protocolNumber = `PR-${Date.now()}`;

    const newProtocol = new Protocol({
      lot: lotId,
      winner: winnerId,
      protocolNumber,
      status: "active"
    });
    
    await newProtocol.save();
    res.status(201).json({ message: "Bayonnoma yaratildi", protocol: newProtocol });
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

const getProtocols = async (req, res) => {
  try {
    const protocols = await Protocol.find().populate("lot winner");
    res.status(200).json(protocols);
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

const getUserProtocols = async (req, res) => {
  try {
    const protocols = await Protocol.find({ winner: req.user._id, status: "active" }).populate("lot winner");
    res.status(200).json(protocols);
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

const updateProtocolStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const protocol = await Protocol.findByIdAndUpdate(id, { status }, { new: true });
    res.status(200).json({ message: "Status yangilandi", protocol });
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

const downloadProtocolPDF = async (req, res) => {
  try {
    const protocol = await Protocol.findById(req.params.id).populate("lot winner");
    if (!protocol) return res.status(404).json({ message: "Bayonnoma topilmadi" });

    // Generate QR Code
    const verifyUrl = `http://localhost:3000/verify-protocol/${protocol._id}`;
    const qrImage = await QRCode.toDataURL(verifyUrl);

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-disposition', `attachment; filename="protocol_${protocol.protocolNumber}.pdf"`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    // Title Header
    doc.fillColor("#18436E").fontSize(26).text("ELEKTRON ONLAYN AUKSION", { align: "center" });
    doc.fontSize(20).text("SAVDO BAYONNOMASI", { align: "center" });
    doc.moveDown(1);
    
    // Draw a line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#18436E").lineWidth(2).stroke();
    doc.moveDown(2);

    // Protocol Main Info
    doc.fillColor("black").fontSize(12).font("Helvetica-Bold").text(`Bayonnoma №: `, { continued: true }).font("Helvetica").text(protocol.protocolNumber);
    doc.font("Helvetica-Bold").text(`Sana: `, { continued: true }).font("Helvetica").text(new Date(protocol.createdAt).toLocaleDateString("uz-UZ"));
    doc.moveDown(2);

    // Winner Info Table-like structure
    doc.fillColor("#18436E").fontSize(16).font("Helvetica-Bold").text("1. SAVDO G'OLIBI HAQIDA MA'LUMOT");
    doc.moveDown(0.5);
    
    doc.fillColor("black").fontSize(12).font("Helvetica-Bold");
    const user = protocol.winner;
    doc.text("F.I.SH: ", { continued: true }).font("Helvetica").text(`${user.lastName} ${user.firstName} ${user.middleName}`);
    doc.font("Helvetica-Bold").text("JSHSHIR: ", { continued: true }).font("Helvetica").text(user.jshshir);
    
    if (user.fullAddress) {
      doc.font("Helvetica-Bold").text("Manzil: ", { continued: true }).font("Helvetica").text(`${user.fullAddress.region}, ${user.fullAddress.city}, ${user.fullAddress.street}, ${user.fullAddress.houseNumber}-uy`);
    }
    doc.font("Helvetica-Bold").text("Telefon: ", { continued: true }).font("Helvetica").text(user.phoneNumber);
    doc.moveDown(2);

    // Lot Info
    doc.fillColor("#18436E").fontSize(16).font("Helvetica-Bold").text("2. OBYEKT (LOT) BO'YICHA MA'LUMOT");
    doc.moveDown(0.5);
    
    const lot = protocol.lot;
    doc.fillColor("black").fontSize(12).font("Helvetica-Bold");
    doc.text("Lot nomi: ", { continued: true }).font("Helvetica").text(lot.name);
    doc.font("Helvetica-Bold").text("Lot raqami: ", { continued: true }).font("Helvetica").text(lot.lotNumber);
    doc.font("Helvetica-Bold").text("Boshlang'ich narx: ", { continued: true }).font("Helvetica").text(`${lot.startPrice?.toLocaleString()} SO'M`);
    doc.font("Helvetica-Bold").text("Yakuniy narx: ", { continued: true }).font("Helvetica").text(`${lot.startPrice?.toLocaleString()} SO'M`); // In real bidding this would be different
    doc.moveDown(3);

    // Footer / Footer QR
    doc.fontSize(10).fillColor("gray").text("Ushbu hujjat elektron shaklda shakllantirilgan. QR-kod orqali uning haqiqiyligini tekshirish mumkin.", { align: "center", italic: true });

    // QR image at the bottom left or right
    doc.image(qrImage, 450, 650, { fit: [100, 100] });
    
    doc.fontSize(10).text("Hujjatni tekshirish uchun QR-kodni skanerlang", 430, 755, { width: 140, align: "center" });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

module.exports = { createProtocol, getProtocols, getUserProtocols, updateProtocolStatus, downloadProtocolPDF };
