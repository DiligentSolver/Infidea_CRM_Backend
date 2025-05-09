const express = require("express");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const {
  sendEmployeeDetails,
  updateEmployeeProfile,
} = require("../controllers/employeeController");

const {
  getDashboardOverview,
  getTodayOverview,
  getCompleteAnalytics,
  getDashboardVisualData,
  getRecentFeeds,
  getAttendanceCalendar,
} = require("../controllers/employeeDashboardController");

const router = express.Router();

router.put(
  "/update-employee-profile",
  authMiddleware,
  roleMiddleware(["employee"]),
  updateEmployeeProfile
);

router.get(
  "/employee-profile",
  authMiddleware,
  roleMiddleware(["employee"]),
  sendEmployeeDetails
);

// Dashboard analytics routes
router.get(
  "/overview",
  authMiddleware,
  roleMiddleware(["employee"]),
  getDashboardOverview
);

router.get(
  "/today-overview",
  authMiddleware,
  roleMiddleware(["employee"]),
  getTodayOverview
);

router.get(
  "/analytics",
  authMiddleware,
  roleMiddleware(["employee"]),
  getCompleteAnalytics
);

// New route for dashboard visual data (graphs, charts, and feeds)
router.get(
  "/dashboard-visual-data",
  authMiddleware,
  roleMiddleware(["employee"]),
  getDashboardVisualData
);

// New route for fetching recent feed items (fallback for WebSockets)
router.get(
  "/recent-feeds",
  authMiddleware,
  roleMiddleware(["employee"]),
  getRecentFeeds
);

// New route for attendance calendar
router.get(
  "/attendance-calendar",
  authMiddleware,
  roleMiddleware(["employee"]),
  getAttendanceCalendar
);

module.exports = router;
