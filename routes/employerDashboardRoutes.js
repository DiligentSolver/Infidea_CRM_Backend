const express = require("express");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");
const {
  getEmployerDashboardStats,
} = require("../controllers/employerDashboardController");
const {
  postJob,
  viewApplicants,
  editJob,
  deleteJob,
  getEmployerJobs,
  shortlistApplicant,
  hireCandidate,
  rejectCandidate,
  updateEmployerProfile,
  sendEmployerDetails,
} = require("../controllers/employerController");

const { downloadApplicantsExcel } = require("../utils/excelOutputs");

const router = express.Router();

router.get(
  "/dashboard",
  authMiddleware,
  roleMiddleware(["employer"]),
  getEmployerDashboardStats
);

router.post("/post-job", authMiddleware, roleMiddleware(["employer"]), postJob);

router.get(
  "/view-applications/:jobId",
  authMiddleware,
  roleMiddleware(["employer"]),
  viewApplicants
);

router.get(
  "/download-applicants",
  authMiddleware,
  roleMiddleware(["employer"]),
  downloadApplicantsExcel
);

router.patch(
  "/edit-job/:jobId",
  authMiddleware,
  roleMiddleware(["employer"]),
  editJob
);

router.delete(
  "/delete-job/:jobId",
  authMiddleware,
  roleMiddleware(["employer"]),
  deleteJob
);

router.get(
  "/posted-jobs/:employerId",
  authMiddleware,
  roleMiddleware(["employer"]),
  getEmployerJobs
);

router.post(
  "/shortlist",
  authMiddleware,
  roleMiddleware(["employer"]),
  shortlistApplicant
);

router.post(
  "/hire",
  authMiddleware,
  roleMiddleware(["employer"]),
  hireCandidate
);

router.post(
  "/reject",
  authMiddleware,
  roleMiddleware(["employer"]),
  rejectCandidate
);

router.put(
  "/update-employer-profile",
  authMiddleware,
  roleMiddleware(["employer"]),
  updateEmployerProfile
);

router.get(
  "/employer-profile",
  authMiddleware,
  roleMiddleware(["employer"]),
  sendEmployerDetails
);

module.exports = router;
