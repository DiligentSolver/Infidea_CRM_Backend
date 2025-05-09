const express = require("express");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");
const {
  getJobRecommendations,
} = require("../controllers/recommendationController");

const router = express.Router();

router.get(
  "/recommended",
  authMiddleware,
  roleMiddleware(["jobseeker"]),
  getJobRecommendations
);

module.exports = router;
