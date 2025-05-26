const express = require("express");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const {
  sendEmployeeDetails,
  updateEmployeeProfile,
  getProfileImageUrl,
  updateProfilePicture,
  getUserTheme,
  updateUserTheme,
} = require("../controllers/employeeController");

const {
  getDashboardOverview,
  getTodayOverview,
  getCompleteAnalytics,
  getDashboardVisualData,
  getRecentFeeds,
  getAttendanceCalendar,
  getIncentivesData,
  getDashboardStats,
  getEmployeesData,
  generateDailyReport,
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

router.get(
  "/incentives-data",
  authMiddleware,
  roleMiddleware(["employee"]),
  getIncentivesData
);

router.get(
  "/employee-profile-image-url",
  authMiddleware,
  roleMiddleware(["employee"]),
  getProfileImageUrl
);

router.put(
  "/update-employee-profile-image",
  authMiddleware,
  roleMiddleware(["employee"]),
  updateProfilePicture
);

// Daily report generation route (admin only)
router.post("/generate-daily-report", generateDailyReport);

router.get(
  "/theme",
  authMiddleware,
  roleMiddleware(["employee"]),
  getUserTheme
);

router.post(
  "/theme",
  authMiddleware,
  roleMiddleware(["employee"]),
  updateUserTheme
);

module.exports = router;
