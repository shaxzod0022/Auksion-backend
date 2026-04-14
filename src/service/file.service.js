const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

class FileService {
  save(file) {
    try {
      const fileName = uuidv4() + path.extname(file.name);
      const staticDir = path.resolve(__dirname, "..", "upload");
      const filePath = path.join(staticDir, fileName);

      if (!fs.existsSync(staticDir)) {
        fs.mkdirSync(staticDir, { recursive: true });
      }

      file.mv(filePath);
      return fileName;
    } catch (error) {
      throw new Error(`Xatolik: ${error}`);
    }
  }
}

module.exports = new FileService();