const express = require("express");
const router = express.Router();
const { unifiedSearch } = require("../controller/search.controller");

router.get("/", unifiedSearch);

module.exports = router;
