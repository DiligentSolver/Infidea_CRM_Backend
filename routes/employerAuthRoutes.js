const express = require("express");
const {
  sendEmployerOtp,
  verifyEmployerOtp,
  registerEmployer,
  loginEmployer,
  resendEmployerOtp,
  forgotEmployerPassword,
  resetEmployerPassword,
  requestEmployerEmailVerification,
  verifyEmployerEmail,
  resendEmployerVerifyEmailOtp,
  logoutEmployer,
} = require("../controllers/employerAuthController");
const router = express.Router();

// Employer Send OTP to user's mobile
router.post("/employer-send-otp", sendEmployerOtp);

// Employer Verify OTP and login
router.post("/employer-verify-otp", verifyEmployerOtp);

// Employer Resend OTP route
router.post("/employer-resend-otp", resendEmployerOtp);

// Employer Login route
router.post("/employer-login", loginEmployer);

// Employer Register route
router.post("/employer-register", registerEmployer);

// Employer forgot password route
router.post("/employer-forgot-Password", forgotEmployerPassword);

// Employer Reset Password route
router.post("/employer-reset-password", resetEmployerPassword);

// Employer Email verification otp route
router.post("/employer-email-verification", requestEmployerEmailVerification);

// Employer Email verification resend otp route
router.post("/employer-verify-email", resendEmployerVerifyEmailOtp);

// Employer Reset Password route
router.post("/employer-resend-email-verification", verifyEmployerEmail);

module.exports = router;
