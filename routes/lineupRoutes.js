const express = require("express");
const {
  createLineup,
  getAllLineups,
  getLineupById,
  updateLineup,
  deleteLineup,
  deleteMultipleLineups,
} = require("../controllers/lineupController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Middleware for all lineup routes - only accessible by employees
const employeeMiddleware = [
  authMiddleware,
  roleMiddleware(["employee", "admin"]),
];

// Create a new lineup
router.post("/create", employeeMiddleware, createLineup);

// Get all lineups with pagination
router.get("/", employeeMiddleware, getAllLineups);

// Get lineup by ID
router.get("/:lineupId", employeeMiddleware, getLineupById);

// Update lineup
router.put("/:lineupId", employeeMiddleware, updateLineup);

// Delete lineup
router.delete("/:lineupId", employeeMiddleware, deleteLineup);

// Delete multiple lineups
router.delete("/", employeeMiddleware, deleteMultipleLineups);

module.exports = router;
