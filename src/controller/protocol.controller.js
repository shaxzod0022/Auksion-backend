const Protocol = require("../model/protocol.model");
const Lot = require("../model/lot.model");
const User = require("../model/user.model");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const uzNumberToWords = require("../util/uzNumberToWords");
const fs = require("fs");
const path = require("path");
const fileService = require("../service/file.service");

const createManualProtocol = async (req, res) => {
  try {
    let {
      protocolNumber: customProtocolNumber,
      finalPrice,
      participantsList,
      status,
      manualData,
    } = req.body;

    // Handle manualData if it's sent as a string (from FormData)
    if (typeof manualData === "string") {
      manualData = JSON.parse(manualData);
    }

    let protocolNumber = customProtocolNumber;
    if (!protocolNumber) {
      protocolNumber = `UAI-NF-${Date.now()}`;
    }

    // Handle image uploads
    let images = [];
    if (req.files && req.files.images) {
      const imageFiles = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];
      images = imageFiles.map((file) => fileService.save(file));
    }

    const newProtocol = new Protocol({
      protocolNumber,
      finalPrice: Number(finalPrice || manualData?.finalPrice),
      participantsList,
      status: status || "active",
      isManual: true,
      manualData: {
        ...manualData,
        startDate:
          manualData.startDate && manualData.startDate.length === 16
            ? new Date(manualData.startDate + "+05:00")
            : manualData.startDate
              ? new Date(manualData.startDate)
              : new Date(),
      },
      images,
    });

    await newProtocol.save();
    res.status(201).json({
      message: "Qo'lda kiritilgan bayonnoma yaratildi",
      protocol: newProtocol,
    });
  } catch (err) {
    console.error("Protocol Creation Error:", err);
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

const createProtocol = async (req, res) => {
  try {
    const {
      lotId,
      winnerId,
      finalPrice,
      participantsList,
      protocolNumber: customProtocolNumber,
      status: initialStatus,
    } = req.body;

    let protocolNumber = customProtocolNumber;

    // Create protocol number with UAI NF prefix if not provided
    if (!protocolNumber) {
      const count = await Protocol.countDocuments();
      protocolNumber = `UAI NF - ${2026031 + count}`;
    }

    const lot = await Lot.findById(lotId);
    const winner = await User.findById(winnerId);

    const newProtocol = new Protocol({
      lot: lotId,
      winner: winnerId,
      protocolNumber,
      finalPrice: Number(finalPrice),
      participantsList,
      status: initialStatus || "active",
      manualData: {
        lotNumber: lot?.lotNumber,
        description: lot?.name,
        winnerName: winner
          ? `${winner.lastName} ${winner.firstName} ${winner.middleName || ""}`.trim()
          : "Noma'lum",
        winnerJshshir: winner?.jshshir,
        winnerAddress: winner?.fullAddress
          ? `${winner.fullAddress.region}, ${winner.fullAddress.city}`
          : "-",
        startDate: lot?.startDate,
        startPrice: lot?.startPrice,
      },
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
      { returnDocument: "after" },
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
        populate: ["lotType", "category", "province", "region"],
      })
      .populate("winner");

    if (!protocol)
      return res.status(404).json({ message: "Bayonnoma topilmadi" });

    if (
      !protocol.isManual &&
      (!protocol.lot || !protocol.winner) &&
      !protocol.manualData?.lotNumber
    ) {
      return res.status(400).json({
        message:
          "Bayonnoma ma'lumotlari to'liq emas (Lot yoki G'olib o'chirilgan bo'lishi mumkin)",
      });
    }

    let lotData = {};
    let winnerData = {};

    if (
      protocol.isManual ||
      (!protocol.lot && protocol.manualData?.lotNumber)
    ) {
      lotData = {
        startDate: protocol.manualData.startDate || new Date(),
        lotNumber: protocol.manualData.lotNumber,
        customer:
          protocol.manualData.organizer ||
          "“uainf-auksion” mchj nf – uainf-auksion.uz",
        basisDocument:
          protocol.manualData.basisDocument || "Buyurtma asosida olingan.",
        description: protocol.manualData.description,
        attributes: protocol.manualData.attributes || [],
        startPrice: Number(protocol.manualData.startPrice || 0),
      };
      winnerData = {
        fullName: protocol.manualData.winnerName,
        jshshir: protocol.manualData.winnerJshshir,
        address: protocol.manualData.winnerAddress,
      };
    } else {
      const lot = protocol.lot;
      const user = protocol.winner;
      lotData = {
        startDate: lot.startDate,
        lotNumber: lot.lotNumber,
        customer: lot.customer || "“uainf-auksion” mchj nf – uainf-auksion.uz",
        basisDocument: lot.basisDocument || "Buyurtma asosida olingan.",
        description: lot.description,
        attributes: lot.attributes || [],
        startPrice: lot.startPrice,
      };
      winnerData = {
        fullName:
          `“${user.lastName} ${user.firstName} ${user.middleName || ""}”`.trim(),
        jshshir: user.jshshir,
        address: user.fullAddress
          ? `${user.fullAddress.region || ""}, ${user.fullAddress.city || ""}, ${user.fullAddress.street || ""}, ${user.fullAddress.houseNumber || ""}-uy`
          : "-",
      };
    }

    const verifyUrl = `https://considerate-integrity-production.up.railway.app/api/protocol/${protocol._id}/download`;
    const qrImage = await QRCode.toDataURL(verifyUrl);

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    // Font paths (Bundled in project assets)
    const fontRegular = path.join(
      __dirname,
      "../../assets/fonts/LiberationSerif-Regular.ttf",
    );
    const fontBold = path.join(
      __dirname,
      "../../assets/fonts/LiberationSerif-Bold.ttf",
    );

    res.setHeader(
      "Content-disposition",
      `attachment; filename="protocol_${protocol.protocolNumber.replace(/\s/g, "_")}.pdf"`,
    );
    res.setHeader("Content-type", "application/pdf");
    doc.pipe(res);

    // 1. Header Section
    doc
      .font(fontBold)
      .fontSize(10)
      .text("ELEKTRON ONLAYN AUKSION SAVDOLARI NATIJASIGA KO'RA", {
        align: "center",
      });
    doc.text(
      "uainf-auksion.uz markazlashgan saytida shakllantirilgan g'oliblik BAYONNOMASI",
      { align: "center" },
    );
    doc.moveDown(0.5);
    doc.text(`№ ${protocol.protocolNumber}`, { align: "center" });
    doc.moveDown(0.8);

    // Helper for rows
    const drawRow = (label, value) => {
      const startX = 50;
      const labelWidth = 210; // Label kengligini biroz qisqartirdik
      const valueX = 290; // Qiymat uchun ko'proq joy ochdik
      const valueWidth = 280;
      const currentY = doc.y;

      // Qatorlar orasidagi masofani minimal qilish uchun lineGap: 1
      const options = { width: labelWidth, lineGap: 1 };
      const valueOptions = { width: valueWidth, lineGap: 1 };

      doc.font(fontBold).fontSize(10).text(label, startX, currentY, options);
      const labelHeight = doc.heightOfString(label, options);

      doc
        .font(fontRegular)
        .fontSize(10)
        .text(value || "-", valueX, currentY, valueOptions);
      const valueHeight = doc.heightOfString(value || "-", valueOptions);

      // moveDown o'rniga aniq balandlikni hisoblaymiz va ozgina (masalan 5 birlik) padding qo'shamiz
      const rowHeight = Math.max(labelHeight, valueHeight);
      doc.y = currentY + rowHeight + 10;

      // Agar sahifa tugab qolsa, avtomatik yangi sahifaga o'tish uchun:
      if (doc.y > 750) {
        doc.addPage();
      }
    };

    // 2. Data Rows
    drawRow(
      "Elektron onlayn – auktsion savdosi o'tkazilgan sana",
      `${new Date(lotData.startDate).toLocaleDateString("uz-UZ")} yil.`,
    );
    drawRow("Lot raqami:", lotData.lotNumber);
    drawRow("Savdo tashkilotchisi:", lotData.customer);
    drawRow(
      "Auktsion shakli va turi:",
      protocol.isManual
        ? protocol.manualData.auctionType || "-"
        : "Narxi oshib borish tartibida o'tkaziladigan ochiq elektron onlayn auktsion savdosi. Xususiy buyurtmalar",
    );
    drawRow(
      "Obyektni Elektron onlayn – auktsion savdosiga qo'yish uchun asos:",
      lotData.basisDocument,
    );

    // Object Details
    const lotAttributes = lotData.attributes || [];
    const carDetails = lotAttributes
      .map((attr) => `${attr.key} – ${attr.value}`)
      .join(",\n");

    drawRow(
      "Obyektni tavsiflovchi ma'lumotlar:",
      carDetails || lotData.description,
    );

    const startPriceWords = uzNumberToWords(lotData.startPrice);
    drawRow(
      "Onlayn auktsion savdosiga qo'yilgan mulkning boshlang'ich bahosi:",
      `${lotData.startPrice?.toLocaleString()} (${startPriceWords}) so'm`,
    );

    const finalPrice = protocol.finalPrice || lotData.startPrice;
    const finalPriceWords = uzNumberToWords(finalPrice);
    drawRow(
      "Onlayn auktsion savdosiga qo'yilgan mulkning sotilgan bahosi:",
      `${finalPrice?.toLocaleString()} (${finalPriceWords}) so'm`,
    );

    let formattedParticipants = "-";
    if (Array.isArray(protocol.participantsList)) {
      formattedParticipants = protocol.participantsList.join(",\n");
    } else if (
      typeof protocol.participantsList === "string" &&
      protocol.participantsList.trim()
    ) {
      const pList = protocol.participantsList;
      if (pList.includes(",") || pList.includes("\n")) {
        formattedParticipants = pList
          .split(/[,\n]+/)
          .map((p) => p.trim())
          .filter(Boolean)
          .join(",\n");
      } else {
        formattedParticipants = pList
          .split(/\s+/)
          .map((p) => p.trim())
          .filter(Boolean)
          .join(",\n");
      }
    }

    drawRow("Onlayn auktsion savdosi ishtirokchilari:", formattedParticipants);

    const winnerInfo = protocol.isManual
      ? [
          protocol.manualData.winnerName,
          protocol.manualData.winnerJshshir,
          `manzili: ${protocol.manualData.winnerAddress}`,
        ].join("\n")
      : [
          winnerData.fullName,
          `JSHSHIR: ${winnerData.jshshir}`,
          `manzili: ${winnerData.address}`,
        ].join("\n");

    drawRow(
      "Onlayn auktsion savdosi g'olibi:\n(shaxs haqida ma'lumotlar, manzili)",
      winnerInfo || "-",
    );

    // 3. Legal Info
    doc.font(fontBold).fontSize(10).text("Qo'shimcha ma'lumotlar:", 50, doc.y, {
      lineGap: 1,
      width: 490,
      align: "left",
    });
    doc
      .font(fontRegular)
      .fontSize(10)
      .text(
        "O'zbekiston Respublikasi Prezidentining 2021 yil 24 iyuldagi Elektron onlayn – auktsion savdolarini o'tkazish tartibini, uning shaffofligini oshirish hamda ishtirokchilar huquqlarining ishonchli himoyasini kafolatlash chora-tadbirlari to'g'risidagi PQ-5197-sonli qarorining 2-bandiga muvofiq ijro hujjatlari bo'yicha avtomototransport vositalarini realizatsiya qilish uchun o'tkazilgan elektron onlayn – auktsion savdolari natijalari haqidagi bayonnoma uni taqiqdan yechish, shuningdek auktsion g'olibi nomiga ro'yxatdan o'tkazish (hisobga qo'yish) uchun asos hisoblanadi.",
        50,
        doc.y,
        { align: "justify", width: 500, lineGap: 2 },
      );

    // 4. QR Code Section (Text on left 65%, QR Code on right)
    const qrSectionY = doc.y;
    const textWidth = 310; // Taxminan 65% (490 * 0.65)
    const qrSize = 75;
    const qrText =
      "Bayonnomada keltirilgan ma'lumotlar to'g'riligini tekshirish uchun mobil telefon yordamida QR-kodni skaner qiling. Hujjat nusxasidagi ma'lumotlarning mutanosibligi uning haqiqiyligini tasdiqlaydi. Aks holda hujjatning nusxasidagi mos bo'lmagan ma'lumotlar soxtalashtirilgan, tahrirlangan deb baholanishi asoslidir.";

    doc.font(fontRegular).fontSize(10).text(qrText, 50, qrSectionY, {
      align: "justify",
      width: textWidth,
      lineGap: 2,
    });

    // QR kodni o'ng tomonga joylashtirish
    doc.image(qrImage, 420, qrSectionY, { width: qrSize });

    // Keyingi qismlar matn yoki QR koddan pastda boshlanishi uchun doc.y ni yangilaymiz
    const textHeight = doc.heightOfString(qrText, {
      width: textWidth,
      lineGap: 2,
    });
    doc.y = Math.max(qrSectionY + textHeight, qrSectionY + qrSize) + 15;

    // 5. Images Section
    if (protocol.images && protocol.images.length > 0) {
      doc.addPage();
      doc
        .font(fontBold)
        .fontSize(14)
        .text("Obyekt fotosuratlari:", { align: "center" });
      doc.moveDown(1);

      const startX = 50;
      const startY = doc.y;
      const imgWidth = 240;
      const imgHeight = 180;
      const gap = 20;

      protocol.images.forEach((imgName, index) => {
        const imgPath = path.join(__dirname, "..", "upload", imgName);
        if (fs.existsSync(imgPath)) {
          const col = index % 2;
          const row = Math.floor(index / 2);

          const x = startX + col * (imgWidth + gap);
          const y = startY + row * (imgHeight + gap);

          try {
            doc.image(imgPath, x, y, {
              fit: [imgWidth, imgHeight],
              align: "center",
              valign: "center",
            });
          } catch (imgErr) {
            console.error("Image loading error:", imgErr);
          }
        }
      });
    }

    doc.end();
  } catch (err) {
    console.error("PDF Generate Error:", err);
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

const getProtocolVerify = async (req, res) => {
  try {
    const protocol = await Protocol.findById(req.params.id)
      .populate({
        path: "lot",
        populate: ["lotType", "category", "province", "region"],
      })
      .populate("winner");

    if (!protocol) {
      return res.status(404).json({ message: "Bayonnoma topilmadi" });
    }

    let lotData = {};
    let winnerData = {};

    if (
      protocol.isManual ||
      (!protocol.lot && protocol.manualData?.lotNumber)
    ) {
      lotData = {
        name: protocol.manualData.description || "Auksion obyekti",
        lotNumber: protocol.manualData.lotNumber,
        startDate: protocol.manualData.startDate,
      };
      winnerData = {
        name: protocol.manualData.winnerName,
        jshshir: protocol.manualData.winnerJshshir,
        address: protocol.manualData.winnerAddress,
      };
    } else {
      const lot = protocol.lot;
      const user = protocol.winner;
      lotData = {
        name: lot.name,
        lotNumber: lot.lotNumber,
        startDate: lot.startDate,
      };
      winnerData = {
        name: `${user.lastName} ${user.firstName} ${user.middleName || ""}`.trim(),
        jshshir: user.jshshir,
        address: user.fullAddress
          ? `${user.fullAddress.region || ""}, ${user.fullAddress.city || ""}`
          : "-",
      };
    }

    res.status(200).json({
      protocolNumber: protocol.protocolNumber,
      createdAt: protocol.createdAt,
      finalPrice: protocol.finalPrice,
      isManual: protocol.isManual,
      lotData,
      winnerData,
    });
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

const updateProtocol = async (req, res) => {
  try {
    const { id } = req.params;
    let { protocolNumber, finalPrice, participantsList, status, manualData } =
      req.body;

    // Handle manualData if it's sent as a string (from FormData)
    if (typeof manualData === "string") {
      manualData = JSON.parse(manualData);
    }

    const protocol = await Protocol.findById(id);
    if (!protocol) {
      return res.status(404).json({ message: "Bayonnoma topilmadi" });
    }

    // Handle image uploads if provided
    let images = protocol.images || [];
    if (req.files && req.files.images) {
      const imageFiles = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];
      images = imageFiles.map((file) => fileService.save(file));
    }

    const updateData = {
      protocolNumber: protocolNumber || protocol.protocolNumber,
      finalPrice:
        finalPrice !== undefined ? Number(finalPrice) : protocol.finalPrice,
      participantsList:
        participantsList !== undefined
          ? participantsList
          : protocol.participantsList,
      status: status || protocol.status,
      images,
    };

    if (manualData) {
      updateData.manualData = {
        ...protocol.manualData.toObject(),
        ...manualData,
        startDate: manualData.startDate
          ? new Date(manualData.startDate)
          : protocol.manualData.startDate,
      };
    }

    const updatedProtocol = await Protocol.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res.status(200).json({
      message: "Bayonnoma muvaffaqiyatli yangilandi",
      protocol: updatedProtocol,
    });
  } catch (err) {
    console.error("Protocol Update Error:", err);
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

const deleteProtocol = async (req, res) => {
  try {
    const { id } = req.params;
    const protocol = await Protocol.findByIdAndDelete(id);
    if (!protocol) {
      return res.status(404).json({ message: "Bayonnoma topilmadi" });
    }
    res.status(200).json({ message: "Bayonnoma muvaffaqiyatli o'chirildi" });
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

module.exports = {
  createManualProtocol,
  createProtocol,
  getProtocols,
  getUserProtocols,
  updateProtocolStatus,
  updateProtocol,
  downloadProtocolPDF,
  deleteProtocol,
  getProtocolVerify,
};
