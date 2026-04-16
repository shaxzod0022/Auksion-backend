const Protocol = require("../model/protocol.model");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const uzNumberToWords = require("../util/uzNumberToWords");
const path = require("path");

const createProtocol = async (req, res) => {
  try {
    const { lotId, winnerId, finalPrice, participantsList } = req.body;

    // Create protocol number with UAI NF prefix
    const count = await Protocol.countDocuments();
    const protocolNumber = `UAI NF - ${2026031 + count}`;

    const newProtocol = new Protocol({
      lot: lotId,
      winner: winnerId,
      protocolNumber,
      finalPrice: Number(finalPrice),
      participantsList,
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
      winner: req.user?._id,
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
    const protocol = await Protocol.findById(req.params.id)
      .populate({
        path: "lot",
        populate: ["lotType", "category", "province", "region"]
      })
      .populate("winner");

    if (!protocol)
      return res.status(404).json({ message: "Bayonnoma topilmadi" });

    const lot = protocol.lot;
    const user = protocol.winner;

    const verifyUrl = `https://www.uainf-auksion.uz/verify-protocol/${protocol._id}`;
    const qrImage = await QRCode.toDataURL(verifyUrl);

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    // Font paths
    const fontRegular = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf";
    const fontBold = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf";

    res.setHeader(
      "Content-disposition",
      `attachment; filename="protocol_${protocol.protocolNumber.replace(/\s/g, "_")}.pdf"`,
    );
    res.setHeader("Content-type", "application/pdf");
    doc.pipe(res);

    // 1. Header Section
    doc
      .font(fontBold)
      .fontSize(11)
      .text("ELEKTRON ONLAYN AUKSION SAVDOLARI NATIJASIGA KO'RA", { align: "center" });
    doc.text("uai.uz markazlashgan saytida shakllantirilgan g'oliblik BAYONNOMASI", { align: "center" });
    doc.moveDown(0.5);
    doc.text(`№ ${protocol.protocolNumber}`, { align: "center" });
    doc.moveDown(1);

    // Helper for rows
    const drawRow = (label, value) => {
      const startX = 50;
      const labelWidth = 230;
      const valueX = 290;
      const currentY = doc.y;

      doc.font(fontBold).fontSize(10).text(label, startX, currentY, { width: labelWidth, lineGap: 5 });
      const labelHeight = doc.heightOfString(label, { width: labelWidth, lineGap: 5 });

      doc.font(fontRegular).fontSize(10).text(value || "-", valueX, currentY, { width: 250, lineGap: 5 });
      const valueHeight = doc.heightOfString(value || "-", { width: 250, lineGap: 5 });

      doc.moveDown(Math.max(labelHeight, valueHeight) / 10 + 0.5);
    };

    // 2. Data Rows
    drawRow(
      "Elektron onlayn – auktsion savdosi o'tkazilgan sana",
      `${new Date(lot.startDate).toLocaleDateString("uz-UZ")} yil.`
    );
    drawRow("Lot raqami:", lot.lotNumber);
    drawRow("Savdo tashkilotchisi:", lot.customer || "“uai” mchj nf – uai.uz");
    drawRow(
      "Auktsion shakli va turi:",
      "Narxi oshib borish tartibida o'tkaziladigan ochiq elektron onlayn auktsion savdosi. Xususiy buyurtmalar"
    );
    drawRow(
      "Obyektni Elektron onlayn – auktsion savdosiga qo'yish uchun asos:",
      lot.basisDocument || "Buyurtma asosida olingan buyurtmasi."
    );

    // Object Details
    const lotAttributes = lot.attributes || [];
    const carDetails = lotAttributes
      .map(attr => `${attr.key} – ${attr.value},`)
      .join("\n");

    drawRow("Obyektni tavsiflovchi ma'lumotlar:", carDetails || lot.description);

    const startPriceWords = uzNumberToWords(lot.startPrice);
    drawRow(
      "Onlayn auktsion savdosiga qo'yilgan mulkning boshlang'ich bahosi:",
      `${lot.startPrice?.toLocaleString()} (${startPriceWords}) so'm`
    );

    const finalPrice = protocol.finalPrice || lot.startPrice;
    const finalPriceWords = uzNumberToWords(finalPrice);
    drawRow(
      "Onlayn auktsion savdosiga qo'yilgan mulkning sotilgan bahosi:",
      `${finalPrice?.toLocaleString()} (${finalPriceWords}) so'm`
    );

    drawRow(
      "Onlayn auktsion savdosi ishtirokchilari:",
      protocol.participantsList || "-"
    );

    const winnerInfo = [
      `“${user.lastName} ${user.firstName} ${user.middleName}”`,
      `JSHSHIR: ${user.jshshir}`,
      `manzili: ${user.fullAddress?.region}, ${user.fullAddress?.city}, ${user.fullAddress?.street}, ${user.fullAddress?.houseNumber}-uy`
    ].join("\n");

    drawRow(
      "Onlayn auktsion savdosi g'olibi:\n(yuridik shaxs nomi, STIR raqami,\njismoniy shaxs FIO, pasport ma'lumotlari)",
      winnerInfo
    );

    doc.moveDown(2);

    // 3. Legal Info
    doc.font(fontBold).fontSize(9).text("Qo'shimcha ma'lumotlar:", { lineGap: 3 });
    doc.font(fontRegular).fontSize(9).text(
      "O'zbekiston Respublikasi Prezidentining 2021 yil 24 iyuldagi Elektron onlayn – auktsion savdolarini o'tkazish tartibini, uning shaffofligini oshirish hamda ishtirokchilar huquqlarining ishonchli himoyasini kafolatlash chora-tadbirlari to'g'risidagi PQ-5197-sonli qarorining 2-bandiga muvofiq ijro hujjatlari bo'yicha avtomototransport vositalarini realizatsiya qilish uchun o'tkazilgan elektron onlayn – auktsion savdolari natijalari haqidagi bayonnoma uni taqiqdan yechish, shuningdek auktsion g'olibi nomiga ro'yxatdan o'tkazish (hisobga qo'yish) uchun asos hisoblanadi.\n" +
      "Bayonnomada keltirilgan ma'lumotlar to'g'riligini tekshirish uchun mobil telefon yordamida QR-kodni skaner qiling. Hujjat nusxasidagi ma'lumotlarning mutanosibligi uning haqiqiyligini tasdiqlaydi. Aks holda hujjatning nusxasidagi mos bo'lmagan ma'lumotlar soxtalashtirilgan, tahrirlangan deb baholanishi asoslidir.",
      { align: "justify", lineGap: 2 }
    );

    doc.moveDown(2);

    // 4. QR Code Section
    const qrY = doc.y;
    doc.image(qrImage, 420, qrY, { width: 100 });

    doc.end();
  } catch (err) {
    console.error("PDF Generate Error:", err);
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
