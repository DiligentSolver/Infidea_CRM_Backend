const express = require("express");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");
const {
  getNotifications,
  markAsRead,
} = require("../controllers/notificationController");

const router = express.Router();

router.get(
  "/notify",
  authMiddleware,
  roleMiddleware(["jobseeker"]),
  getNotifications
);

router.patch(
  "/:notificationId/read",
  authMiddleware,
  roleMiddleware(["jobseeker"]),
  markAsRead
);

module.exports = router;
