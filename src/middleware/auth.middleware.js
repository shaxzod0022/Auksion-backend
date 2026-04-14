const jwt = require("jsonwebtoken");
const Admin = require("../model/admin.model");
const User = require("../model/user.model");

const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Try finding in Admin collection
      let account = await Admin.findById(decoded.id).select("-password");
      
      // If not an admin, try finding in User collection
      if (!account) {
        account = await User.findById(decoded.id).select("-password");
      }

      if (!account) {
        return res.status(401).json({ message: "Sizning hisobingiz topilmadi!" });
      }

      req.admin = account; // for admin-side compatibility
      req.user = account;  // for user-side compatibility
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Token yaroqsiz!" });
    }
  }
  if (!token) {
    return res.status(401).json({ message: "Token mavjud emas. Ruxsat yo'q!" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        message: `Sizning rolingiz (${req.admin.role}) ushbu amalni bajarish uchun ruxsat bermaydi!`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
