const express = require("express");
const router = express.Router();
const {
  exportEntireDatabase,
  exportCollection,
  getDatabaseStats,
} = require("../controllers/databaseExportController");

// Export entire database to Excel
router.get("/export-all", exportEntireDatabase);

// Export specific collection to Excel
router.get("/export/:collectionName", exportCollection);

// Get database statistics
router.get("/stats", getDatabaseStats);

module.exports = router;
