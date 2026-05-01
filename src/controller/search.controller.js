const searchService = require("../service/search.service");

const unifiedSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Qidiruv so'rovi kiritilishi shart" });
    }

    const results = await searchService.unifiedSearch(q);
    res.status(200).json(results);
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ message: "Qidiruvda xatolik yuz berdi", error: err.message });
  }
};

module.exports = {
  unifiedSearch,
};
