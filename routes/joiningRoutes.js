const express = require("express");
const {
  createJoining,
  getAllJoinings,
  getJoiningById,
  updateJoining,
  deleteJoining,
  deleteMultipleJoinings,
  calculateEmployeeIncentives,
  recalculateAllIncentives,
  getIncentiveRatesInfo,
} = require("../controllers/joiningController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Middleware for all joining routes - only accessible by employees
const employeeMiddleware = [
  authMiddleware,
  roleMiddleware(["employee", "admin"]),
];

// Create a new joining
router.post("/create", employeeMiddleware, createJoining);

// Get all joinings with pagination
router.get("/", employeeMiddleware, getAllJoinings);

// Calculate incentives - must be defined before /:joiningId to prevent conflicts
router.get(
  "/incentives/calculate",
  employeeMiddleware,
  calculateEmployeeIncentives
);

// Recalculate all incentives - must be defined before /:joiningId
router.post(
  "/incentives/recalculate",
  employeeMiddleware,
  recalculateAllIncentives
);

// Get incentive rates
router.get("/incentives/rates", employeeMiddleware, getIncentiveRatesInfo);

// Get joining by ID
router.get("/:joiningId", employeeMiddleware, getJoiningById);

// Update joining
router.put("/:joiningId", employeeMiddleware, updateJoining);

// Delete joining
router.delete("/:joiningId", employeeMiddleware, deleteJoining);

// Delete multiple joinings
router.delete("/", employeeMiddleware, deleteMultipleJoinings);

module.exports = router;
