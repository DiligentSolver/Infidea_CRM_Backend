const express = require("express");
const candidateController = require("../controllers/candidateController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Middleware for all candidate routes - only accessible by employees and admin
const employeeMiddleware = [
  authMiddleware,
  roleMiddleware(["employee", "admin"]),
];

// Check duplicity by mobile number
router.get(
  "/check-duplicate/:mobileNo",
  employeeMiddleware,
  candidateController.checkDuplicity
);

router.post(
  "/mark/:mobileNo",
  employeeMiddleware,
  candidateController.markCandidate
);

router.get(
  "/check-duplicate-input/:mobileNo",
  employeeMiddleware,
  candidateController.checkDulicateInputField
);

// Get my candidates
router.get(
  "/my-candidates",
  employeeMiddleware,
  candidateController.getMyCandidates
);

// Get candidates by status
router.get(
  "/status/:status",
  employeeMiddleware,
  candidateController.getCandidatesByStatus
);

// Get candidate call history
router.get(
  "/:id/call-history",
  employeeMiddleware,
  candidateController.getCandidateCallHistory
);

// Create a new candidate
router.post("/create", employeeMiddleware, candidateController.createCandidate);

// Get all candidates
router.get("/", employeeMiddleware, candidateController.getAllCandidates);

// Get candidate by ID
router.get("/:id", employeeMiddleware, candidateController.getCandidate);

// Update candidate
router.patch(
  "/:candidateId",
  employeeMiddleware,
  candidateController.updateCandidate
);

// Delete candidate
router.delete(
  "/:id",
  roleMiddleware(["admin"]),
  candidateController.deleteCandidate
);

// Update candidate status
router.patch(
  "/:id/status",
  employeeMiddleware,
  candidateController.updateCandidateStatus
);

// Bulk upload candidates from Excel
router.post(
  "/bulk-upload",
  employeeMiddleware,
  candidateController.bulkUploadCandidates
);

// Check remaining upload quota for today
router.get(
  "/upload-quota",
  employeeMiddleware,
  candidateController.checkRemainingUploadQuota
);

// Add a new route to check if a candidate is locked
router.get(
  "/check-lock/:contactNumber",
  employeeMiddleware,
  candidateController.checkCandidateLockStatus
);

module.exports = router;
