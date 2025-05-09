const express = require("express");
const {
  createWalkin,
  getAllWalkins,
  getWalkinById,
  updateWalkin,
  deleteWalkin,
  deleteMultipleWalkins,
} = require("../controllers/walkinController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Middleware for all walkin routes - only accessible by employees
const employeeMiddleware = [
  authMiddleware,
  roleMiddleware(["employee", "admin"]),
];

// Create a new walkin
router.post("/create", employeeMiddleware, createWalkin);

// Get all walkins with pagination
router.get("/", employeeMiddleware, getAllWalkins);

// Get walkin by ID
router.get("/:walkinId", employeeMiddleware, getWalkinById);

// Update walkin
router.put("/:walkinId", employeeMiddleware, updateWalkin);

// Delete walkin
router.delete("/:walkinId", employeeMiddleware, deleteWalkin);

// Delete multiple walkins
router.delete("/", employeeMiddleware, deleteMultipleWalkins);

module.exports = router;
