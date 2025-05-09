const express = require("express");
const router = express.Router();
const {
  startActivity,
  getCurrentActivity,
  goOnDesk,
  getActivityHistory,
  getActivityTimeLimits,
  getDailyProductivity,
} = require("../controllers/activityController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const employeeMiddleware = [authMiddleware, roleMiddleware(["employee"])];

// All routes require authentication
router.use(employeeMiddleware);

// Start a new activity
router.post("/start", startActivity);

// Get current activity (called on login/page load)
router.get("/current", getCurrentActivity);

// End current activity and go "On Desk"
router.post("/on-desk", goOnDesk);

// Get activity history for the employee
router.get("/history", getActivityHistory);

// Get time limits for activities
router.get("/time-limits", getActivityTimeLimits);

// Get daily productivity metrics (first on-desk time and productive time)
router.get("/on-desk-data", getDailyProductivity);

module.exports = router;
