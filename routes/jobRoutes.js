const express = require("express");
const {
  searchJobs,
  getJobById,
  getAllJobs,
  getJobsByEmployer,
  getTrendingJobs,
} = require("../controllers/jobController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");
const {
  applyForJob,
  withdrawApplication,
  getAppliedJobs,
} = require("../controllers/jobSeekerController");

const router = express.Router();

// Job Seeker Routes
router.post(
  "/apply/:jobId",
  authMiddleware,
  roleMiddleware(["jobseeker"]),
  applyForJob
);
router.post(
  "/withdraw",
  authMiddleware,
  roleMiddleware(["jobseeker"]),
  withdrawApplication
);
router.get(
  "/applied-jobs",
  authMiddleware,
  roleMiddleware(["jobseeker"]),
  getAppliedJobs
);

// Public Routes (No authentication needed)
router.get("/search", searchJobs);
router.get("/all", getAllJobs);
router.get("/trending", getTrendingJobs);
router.get("/:jobId", getJobById);
router.get("/employer/:employerId", getJobsByEmployer);

module.exports = router;
