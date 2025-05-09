const express = require("express");
const {
  sendEmployeeOtp,
  verifyEmployeeOtp,
  resendEmployeeOtp,
  loginEmployee,
  forgotEmployeePassword,
  resetEmployeePassword,
  verifyEmployeeEmail,
  requestEmployeeEmailVerification,
  resendEmployeeForgotPasswordOtp,
  resendEmployeeVerifyEmailOtp,
  registerEmployee,
  logoutEmployee,
} = require("../controllers/employeeAuthController");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

// Send OTP to Employee's mobile
router.post("/send-otp", sendEmployeeOtp);

// Verify OTP and login
router.post("/verify-otp", verifyEmployeeOtp);

// Resend OTP route
router.post("/resend-otp", resendEmployeeOtp);

// Employee Login route
router.post("/login", loginEmployee);

//Employee Register route
router.post("/register", registerEmployee);

//Employee forgot password route
router.post("/forgot-Password", forgotEmployeePassword);

//Employee Verify EMail OTP route
router.post("/verify-email", verifyEmployeeEmail);

//Employee Reset Password route
router.post("/reset-password", resetEmployeePassword);

//Employee Email Verification route
router.post("/request-email-verification", requestEmployeeEmailVerification);

//Email Resend OTP route
router.post("/resend-forgot-password-otp", resendEmployeeForgotPasswordOtp);

//Verify Email Resend OTP route
router.post("/resend-verify-email-otp", resendEmployeeVerifyEmailOtp);

// Logout route - requires authentication
router.post("/logout", authMiddleware, logoutEmployee);

module.exports = router;
