const express = require("express");
const {
  sendEmail,
  getEmailConfig,
  sendLineupEmail,
} = require("../controllers/emailController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Apply authentication middleware to all email routes
router.use(authMiddleware);

// Get email configuration for the frontend
router.get("/config", getEmailConfig);

// Send an email with attachments
router.post("/send", sendEmail);

// // Send a lineup email with HTML content (no attachments)
// router.post("/send", sendLineupEmail);

module.exports = router;
