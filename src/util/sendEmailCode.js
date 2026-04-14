// utils/sendEmailCode.js
const nodemailer = require("nodemailer");

const sendEmailPage = async ({ to, subject, html }) => {
  if (!to) {
    console.error("❌ Email yuborilmayapti: 'to' undefined!");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Admin Support" <${process.env.ADMIN_EMAIL}>`,
      to,
      subject,
      html,
    });

    console.log("📩 Email yuborildi:", to);
  } catch (error) {
    console.error("❌ Email yuborishda xato:", error.message);
  }
};

module.exports = sendEmailPage;
