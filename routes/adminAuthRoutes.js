const express = require("express");
const {
  sendAdminOtp,
  verifyAdminOtp,
  registerAdmin,
  loginAdmin,
  resendAdminOtp,
  forgotAdminPassword,
  resetAdminPassword,
  requestAdminEmailVerification,
  verifyAdminEmail,
  resendAdminVerifyEmailOtp,
  resendAdminForgotPasswordOtp,
} = require("../controllers/employeeController");
const router = express.Router();

// // Send OTP to user's mobile
// router.post("/admin-send-otp", sendAdminOtp);

// // Verify OTP and login
// router.post("/admin-verify-otp", verifyAdminOtp);

// // Resend OTP route
// router.post("/admin-resend-otp", resendAdminOtp);

// Admin Login route
router.post("/login", loginAdmin);

//Admin Register route
router.post("/register", registerAdmin);

//Admin forgot password route
router.post("/forgot-Password", forgotAdminPassword);

//Admin Resend forgot password route
router.post("/resend-forgot-password-otp", resendAdminForgotPasswordOtp);

//Admin Reset Password route
router.post("/reset-password", resetAdminPassword);

//Admin forgot password route
router.post("/email-verification", requestAdminEmailVerification);

// Admin Email verification resend otp route
router.post("/resend-verify-email-otp", resendAdminVerifyEmailOtp);

//Admin Reset Password route
router.post("/verify-email", verifyAdminEmail);

module.exports = router;
