const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Import all models
const Activity = require("../models/activityModel");
const Attendance = require("../models/attendanceModel");
const BulkUploadCount = require("../models/bulkUploadCountModel");
const Candidate = require("../models/candidateModel");
const City = require("../models/cityModel");
const ClientDetails = require("../models/clientDetails");
const Company = require("../models/companyModel");
const Employee = require("../models/employeeModel");
const FrontendApi = require("../models/frontendApis");
const Joining = require("../models/joiningModel");
const Language = require("../models/Language");
const Leave = require("../models/leaveModel");
const Lineup = require("../models/lineupModel");
const Note = require("../models/noteModel");
const Notification = require("../models/notificationModel");
const Setting = require("../models/Setting");
const State = require("../models/stateModel");
const Thought = require("../models/thoughtModel");
const Walkin = require("../models/walkinModel");

/**
 * Convert any value to string for Excel compatibility
 */
const convertToString = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

/**
 * Flatten nested objects for Excel display
 */
const flattenObject = (obj, prefix = "") => {
  let flattened = {};

  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (
        obj[key] !== null &&
        typeof obj[key] === "object" &&
        !Array.isArray(obj[key]) &&
        !(obj[key] instanceof Date)
      ) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = convertToString(obj[key]);
      }
    }
  }

  return flattened;
};

/**
 * Get all unique keys from an array of objects
 */
const getAllKeys = (data) => {
  const allKeys = new Set();
  data.forEach((item) => {
    const flattened = flattenObject(item);
    Object.keys(flattened).forEach((key) => allKeys.add(key));
  });
  return Array.from(allKeys).sort();
};

/**
 * Create Excel worksheet for a collection
 */
const createWorksheet = (workbook, collectionName, data) => {
  if (!data || data.length === 0) {
    const worksheet = workbook.addWorksheet(collectionName);
    worksheet.addRow(["No data found in this collection"]);
    return worksheet;
  }

  const worksheet = workbook.addWorksheet(collectionName);

  // Flatten all objects
  const flattenedData = data.map((item) => flattenObject(item));

  // Get all unique keys
  const allKeys = getAllKeys(flattenedData);

  // Add headers
  worksheet.addRow(allKeys);

  // Style headers
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "366092" },
  };

  // Add data rows
  flattenedData.forEach((item) => {
    const row = allKeys.map((key) => item[key] || "");
    worksheet.addRow(row);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(maxLength + 2, 50); // Max width of 50
  });

  return worksheet;
};

/**
 * Export entire database to Excel
 */
exports.exportEntireDatabase = async (req, res) => {
  try {
    console.log("🚀 Starting complete database export...");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Infidea CRM System";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Add summary sheet
    const summarySheet = workbook.addWorksheet("📊 Export Summary");
    summarySheet.addRow(["Infidea CRM - Complete Database Export"]);
    summarySheet.addRow(["Generated on:", new Date().toLocaleString()]);
    summarySheet.addRow(["Total Collections:", "19"]);
    summarySheet.addRow([""]);
    summarySheet.addRow(["Collection Name", "Record Count", "Status"]);

    const collections = [
      { name: "Activities", model: Activity },
      { name: "Attendance", model: Attendance },
      { name: "Bulk Upload Counts", model: BulkUploadCount },
      { name: "Candidates", model: Candidate },
      { name: "Cities", model: City },
      { name: "Client Details", model: ClientDetails },
      { name: "Companies", model: Company },
      { name: "Employees", model: Employee },
      { name: "Frontend APIs", model: FrontendApi },
      { name: "Joinings", model: Joining },
      { name: "Languages", model: Language },
      { name: "Leaves", model: Leave },
      { name: "Lineups", model: Lineup },
      { name: "Notes", model: Note },
      { name: "Notifications", model: Notification },
      { name: "Settings", model: Setting },
      { name: "States", model: State },
      { name: "Thoughts", model: Thought },
      { name: "Walkins", model: Walkin },
    ];

    let totalRecords = 0;

    // Process each collection
    for (const collection of collections) {
      try {
        console.log(`📋 Processing ${collection.name}...`);

        // Get all data from collection (no limits, no exclusions)
        const data = await collection.model.find({}).lean();
        const count = data.length;
        totalRecords += count;

        // Create worksheet for this collection
        createWorksheet(workbook, collection.name, data);

        // Add to summary
        summarySheet.addRow([collection.name, count, "✅ Exported"]);

        console.log(`✅ ${collection.name}: ${count} records exported`);
      } catch (error) {
        console.error(`❌ Error processing ${collection.name}:`, error.message);
        summarySheet.addRow([collection.name, "Error", "❌ Failed"]);
      }
    }

    // Update summary
    summarySheet.addRow([""]);
    summarySheet.addRow(["Total Records Exported:", totalRecords]);
    summarySheet.addRow(["Export Status:", "✅ Complete"]);

    // Style summary sheet
    summarySheet.getRow(1).font = { bold: true, size: 16 };
    summarySheet.getRow(2).font = { bold: true };
    summarySheet.getRow(3).font = { bold: true };
    summarySheet.getRow(6).font = { bold: true };
    summarySheet.getRow(6).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "E7E6E6" },
    };

    // Auto-fit summary columns
    summarySheet.columns.forEach((column) => {
      column.width = 25;
    });

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `Infidea_CRM_Complete_Database_Export_${timestamp}.xlsx`;
    const filepath = path.join(__dirname, "../uploads/temp", filename);

    // Ensure temp directory exists
    const tempDir = path.dirname(filepath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write Excel file
    await workbook.xlsx.writeFile(filepath);

    console.log(`🎉 Database export completed! Total records: ${totalRecords}`);
    console.log(`📁 File saved: ${filepath}`);

    // Send file as download
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({
          success: false,
          message: "Error downloading file",
          error: err.message,
        });
      } else {
        // Clean up file after download
        setTimeout(() => {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            console.log(`🗑️ Cleaned up temporary file: ${filename}`);
          }
        }, 5000);
      }
    });
  } catch (error) {
    console.error("❌ Database export failed:", error);
    res.status(500).json({
      success: false,
      message: "Database export failed",
      error: error.message,
    });
  }
};

/**
 * Export specific collection to Excel
 */
exports.exportCollection = async (req, res) => {
  try {
    const { collectionName } = req.params;

    // Map collection names to models
    const modelMap = {
      activities: Activity,
      attendance: Attendance,
      "bulk-upload-counts": BulkUploadCount,
      candidates: Candidate,
      cities: City,
      "client-details": ClientDetails,
      companies: Company,
      employees: Employee,
      "frontend-apis": FrontendApi,
      joinings: Joining,
      languages: Language,
      leaves: Leave,
      lineups: Lineup,
      notes: Note,
      notifications: Notification,
      settings: Setting,
      states: State,
      thoughts: Thought,
      walkins: Walkin,
    };

    const Model = modelMap[collectionName.toLowerCase()];
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid collection name",
        availableCollections: Object.keys(modelMap),
      });
    }

    console.log(`📋 Exporting ${collectionName} collection...`);

    // Get all data from collection
    const data = await Model.find({}).lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Infidea CRM System";
    workbook.created = new Date();

    // Create worksheet
    createWorksheet(workbook, collectionName, data);

    // Generate filename
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `Infidea_CRM_${collectionName}_${timestamp}.xlsx`;
    const filepath = path.join(__dirname, "../uploads/temp", filename);

    // Ensure temp directory exists
    const tempDir = path.dirname(filepath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write Excel file
    await workbook.xlsx.writeFile(filepath);

    console.log(`✅ ${collectionName} exported: ${data.length} records`);

    // Send file as download
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({
          success: false,
          message: "Error downloading file",
          error: err.message,
        });
      } else {
        // Clean up file after download
        setTimeout(() => {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            console.log(`🗑️ Cleaned up temporary file: ${filename}`);
          }
        }, 5000);
      }
    });
  } catch (error) {
    console.error(`❌ Collection export failed:`, error);
    res.status(500).json({
      success: false,
      message: "Collection export failed",
      error: error.message,
    });
  }
};

/**
 * Get database statistics
 */
exports.getDatabaseStats = async (req, res) => {
  try {
    const collections = [
      { name: "Activities", model: Activity },
      { name: "Attendance", model: Attendance },
      { name: "Bulk Upload Counts", model: BulkUploadCount },
      { name: "Candidates", model: Candidate },
      { name: "Cities", model: City },
      { name: "Client Details", model: ClientDetails },
      { name: "Companies", model: Company },
      { name: "Employees", model: Employee },
      { name: "Frontend APIs", model: FrontendApi },
      { name: "Joinings", model: Joining },
      { name: "Languages", model: Language },
      { name: "Leaves", model: Leave },
      { name: "Lineups", model: Lineup },
      { name: "Notes", model: Note },
      { name: "Notifications", model: Notification },
      { name: "Settings", model: Setting },
      { name: "States", model: State },
      { name: "Thoughts", model: Thought },
      { name: "Walkins", model: Walkin },
    ];

    const stats = [];
    let totalRecords = 0;

    for (const collection of collections) {
      try {
        const count = await collection.model.countDocuments();
        totalRecords += count;
        stats.push({
          collection: collection.name,
          count: count,
          status: "✅ Available",
        });
      } catch (error) {
        stats.push({
          collection: collection.name,
          count: 0,
          status: "❌ Error: " + error.message,
        });
      }
    }

    res.json({
      success: true,
      message: "Database statistics retrieved",
      totalCollections: collections.length,
      totalRecords: totalRecords,
      collections: stats,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Database stats failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get database statistics",
      error: error.message,
    });
  }
};
