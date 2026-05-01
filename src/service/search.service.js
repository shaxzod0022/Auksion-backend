const Lot = require("../model/lot.model");
const Protocol = require("../model/protocol.model");

class SearchService {
  async unifiedSearch(query) {
    const q = query?.trim();
    if (!q) return { lots: [], protocols: [] };

    // 1. Find Lots by lotNumber (exact or partial)
    const lots = await Lot.find({
      $or: [
        { lotNumber: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } }
      ]
    }).populate("category lotType province region");

    // 2. Find Protocols
    // Find lots that match the query to check protocols associated with them
    const matchingLotIds = lots.map(l => l._id);

    const protocols = await Protocol.find({
      $or: [
        { protocolNumber: { $regex: q, $options: "i" } },
        { "manualData.lotNumber": { $regex: q, $options: "i" } },
        { lot: { $in: matchingLotIds } }
      ]
    }).populate({
      path: "lot",
      populate: ["category", "lotType", "province", "region"]
    }).populate("winner");

    return { lots, protocols };
  }
}

module.exports = new SearchService();
