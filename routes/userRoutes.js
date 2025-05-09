const express = require("express");
const {
  updateProfile,
  sendUserDetails,
  uploadProfileImage,
  uploadResume,
  deleteProfileImage,
  deleteResume,
} = require("../controllers/userController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure disk storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// File filters
const profileImageFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Invalid file type. Only images are allowed!"), false);
  }
  cb(null, true);
};

const resumeFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Only PDF, DOCX, or image files are allowed!"), false);
  }
  cb(null, true);
};

// Configure multer for different file types
const profileUpload = multer({
  storage: storage,
  fileFilter: profileImageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const resumeUpload = multer({
  storage: storage,
  fileFilter: resumeFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Apply Middleware Correctly
router.put(
  "/update-user-profile",
  authMiddleware,
  roleMiddleware(["jobseeker"]),
  updateProfile
);

router.get(
  "/user-profile",
  authMiddleware,
  roleMiddleware(["jobseeker"]),
  sendUserDetails
);

// Upload profile image route
router.post(
  "/profile/upload",
  authMiddleware,
  roleMiddleware(["jobseeker"]),
  profileUpload.single("profileImage"),
  uploadProfileImage
);

// Upload resume route
router.post(
  "/resume/upload",
  authMiddleware,
  roleMiddleware(["jobseeker"]),
  resumeUpload.single("resume"),
  uploadResume
);

// Delete profile image route
router.delete(
  "/profileImage",
  authMiddleware,
  roleMiddleware(["jobseeker"]),
  deleteProfileImage
);

// Delete resume route
router.delete(
  "/resume",
  authMiddleware,
  roleMiddleware(["jobseeker"]),
  deleteResume
);

module.exports = router;
