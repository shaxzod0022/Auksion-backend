require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const fileUpload = require("express-fileupload");

const adminRoutes = require("./routes/admin.route");
const categoryRoutes = require("./routes/category.route");
const lotTypeRoutes = require("./routes/lotType.route");
const lotRoutes = require("./routes/lot.route");
const newsRoutes = require("./routes/news.route");
const userRoutes = require("./routes/user.route");
const contactRoutes = require("./routes/contact.route");
const provinceRoutes = require("./routes/province.route");
const regionRoutes = require("./routes/region.route");
const applicationRoutes = require("./routes/application.route");
const protocolRoutes = require("./routes/protocol.route");

const app = express();
const http = require("http");
const server = http.createServer(app);
const initSocket = require("./utils/socket");

// ⚙️ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

app.use("/upload", express.static("src/upload"));

connectDB();

// 🔗 Routes
app.use("/api/admin", adminRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/lot-type", lotTypeRoutes);
app.use("/api/lot", lotRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/user", userRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/province", provinceRoutes);
app.use("/api/region", regionRoutes);
app.use("/api/application", applicationRoutes);
app.use("/api/protocol", protocolRoutes);

// 🚀 Initialize Socket.io
initSocket(server);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Auto-status update for lots
  const Lot = require('./model/lot.model');
  const Application = require('./model/application.model');
  
  setInterval(async () => {
    try {
      const now = new Date();
      const expiredLots = await Lot.find({ status: "active", endDate: { $lt: now } });
      for (const lot of expiredLots) {
        const appsCount = await Application.countDocuments({ lot: lot._id });
        if (appsCount > 0) {
          lot.status = "successful";
        } else {
          lot.status = "unsuccessful";
        }
        await lot.save();
      }
    } catch (err) {
      console.error("Lot status update error:", err);
    }
  }, 60000);
});
