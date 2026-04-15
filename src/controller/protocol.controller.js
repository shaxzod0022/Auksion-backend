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
      status: "active",
    });

    await newProtocol.save();
    res
      .status(201)
      .json({ message: "Bayonnoma yaratildi", protocol: newProtocol });
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
    const protocols = await Protocol.find({
      winner: req.user._id,
      status: "active",
    }).populate("lot winner");
    res.status(200).json(protocols);
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

const updateProtocolStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const protocol = await Protocol.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    res.status(200).json({ message: "Status yangilandi", protocol });
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

const downloadProtocolPDF = async (req, res) => {
  try {
    const protocol = await Protocol.findById(req.params.id).populate(
      "lot winner",
    );
    if (!protocol)
      return res.status(404).json({ message: "Bayonnoma topilmadi" });

    const lot = protocol.lot;
    const user = protocol.winner;

    // QR Code generatsiyasi (uai.uz kabi markazlashgan saytga yo'naltirilgan)
    const verifyUrl = `https://www.uainf-auksion.uz/verify-protocol/${protocol._id}`;
    const qrImage = await QRCode.toDataURL(verifyUrl);

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader(
      "Content-disposition",
      `attachment; filename="protocol_${protocol.protocolNumber}.pdf"`,
    );
    res.setHeader("Content-type", "application/pdf");
    doc.pipe(res);

    // 1. Sarlavha qismi
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("ELEKTRON ONLAYN AUKSION INVEST SAVDOLARI NATIJASIGA KO'RA", {
        align: "center",
      });
    doc.text(
      "uainf-auksion.uz markazlashgan saytida shakllantirilgan g'oliblik BAYONNOMASI",
      { align: "center" },
    );
    doc.moveDown(0.5);
    doc.text(`№ ${protocol.protocolNumber}`, { align: "center" });
    doc.moveDown(1);

    // Ma'lumotlarni chiqarish funksiyasi (PDF dagi kabi ikki ustunli ko'rinish uchun)
    const writeRow = (label, value) => {
      const currentY = doc.y;
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(label, 40, currentY, { width: 180 });
      doc.font("Helvetica").text(value || "-", 230, currentY, { width: 320 });
      doc.moveDown(1);
    };

    // 2. Asosiy ma'lumotlar bloki [cite: 3, 4, 5, 6, 7]
    writeRow(
      "Elektron onlayn-auksion savdosi o'tkazilgan sana:",
      new Date(protocol.createdAt).toLocaleDateString("uz-UZ"),
    );
    writeRow("Lot raqami:", lot.lotNumber);
    writeRow(
      "Savdo tashkilotchisi:",
      '"uainf-auksion" mchj nf uainf-auksion.uz',
    );
    writeRow(
      "Auksion shakli va turi:",
      "Narxi oshib borish tartibida o'tkaziladigan ochiq elektron onlayn auktsion savdosi. Xususiy buyurtmalar",
    );
    writeRow(
      "Obyektni Elektron onlayn - auktsion savdosiga qo'yish uchun asos:",
      lot.basisDocument || "Buyurtma asosida",
    );

    // 3. Mulk tavsifi
    writeRow("Obyektni tavsiflovchi ma'lumotlar:", lot.description || "-");

    // 4. Narxlar [cite: 9, 10, 25, 26]
    writeRow(
      "Onlayn auksion savdosiga qo'yilgan mulkning boshlang'ich bahosi:",
      `${lot.startPrice?.toLocaleString()} so'm`,
    );
    writeRow(
      "Onlayn auksion savdosiga qo'yilgan mulkning sotilgan bahosi:",
      `${lot.finalPrice?.toLocaleString()} so'm`,
    );

    // 5. Ishtirokchilar va G'olib [cite: 11, 12, 14, 31]
    writeRow(
      "Onlayn auktsion savdosi ishtirokchilari:",
      protocol.participantsList,
    );

    const winnerDetails = `${user.lastName} ${user.firstName} ${user.middleName}, JSHSHIR: ${user.jshshir}, Manzil: ${user.fullAddress?.region}, ${user.fullAddress?.city}, ${user.fullAddress?.street}`;
    writeRow("Onlayn auktsion savdosi g'olibi:", winnerDetails);

    doc.moveDown(2);

    // 6. Huquqiy eslatma (PQ-5197 sonli qaror)
    doc.font("Helvetica-Bold").fontSize(9).text("Qo'shimcha ma'lumotlar:", 40);
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(
        "O'zbekiston Respublikasi Prezidentining 2021-yil 24-iyuldagi PQ-5197-sonli qaroriga muvofiq, ushbu bayonnoma mulkni taqiqdan yechish va g'olib nomiga ro'yxatdan o'tkazish uchun asos hisoblanadi.",
        { align: "justify" },
      );
    doc.moveDown(2);

    // 7. QR Kod va Tekshirish matni [cite: 34, 35]
    const qrY = doc.y;
    doc.image(qrImage, 40, qrY, { width: 80 });
    doc
      .fontSize(8)
      .text(
        "Bayonnomada keltirilgan ma'lumotlar to'g'riligini tekshirish uchun QR-kodni skaner qiling. Hujjat nusxasidagi ma'lumotlarning mutanosibligi uning haqiqiyligini tasdiqlaydi.",
        130,
        qrY + 20,
        { width: 400 },
      );

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

module.exports = {
  createProtocol,
  getProtocols,
  getUserProtocols,
  updateProtocolStatus,
  downloadProtocolPDF,
};
