const express = require("express");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");
const { submitFeedback } = require("../controllers/feedbackController");

const router = express.Router();

router.post(
  "/submit-feedback",
  authMiddleware,
  roleMiddleware(["jobseeker"]),
  submitFeedback
);

module.exports = router;
