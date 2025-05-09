const express = require("express");
const router = express.Router();
const {
  applyLeave,
  getEmployeeLeaves,
  getAllLeaves,
  getLeaveById,
  updateLeaveStatus,
} = require("../controllers/leaveController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const employeeMiddleware = [authMiddleware, roleMiddleware(["employee"])];

const adminMiddleware = [authMiddleware, roleMiddleware(["admin"])];
// Apply for leave - Any authenticated employee can apply
router.post("/apply", employeeMiddleware, applyLeave);

// Get current employee's leaves
router.get("/my-leaves", employeeMiddleware, getEmployeeLeaves);

// Get all leaves - Only for admin
router.get("/all", adminMiddleware, getAllLeaves);

// Get leave details by ID
router.get("/:leaveId", adminMiddleware, getLeaveById);

// Approve or reject leave - Only for admin
router.put("/:leaveId/status", adminMiddleware, updateLeaveStatus);

module.exports = router;
