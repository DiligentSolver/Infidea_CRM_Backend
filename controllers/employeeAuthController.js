const Employee = require("../models/employeeModel");
const Activity = require("../models/activityModel");
const Leave = require("../models/leaveModel");
const Attendance = require("../models/attendanceModel");
const bcrypt = require("bcryptjs");
const { cleanupAttemptKeys } = require("../utils/attemptKeyCleanup");
const { formatAndValidateEmail } = require("../utils/validators/formatEmail");
const { client, connectRedis } = require("../utils/redisClient");
const { handleEncryptData, signInToken } = require("../config/auth");
const { closeAllActiveActivities } = require("../utils/activityUtils");
const {
  sendLoginVerificationOTP,
  verifyLoginOTP,
} = require("../utils/adminOtpService");
const { sendLogoutReport } = require("../utils/logoutReportService");

const {
  checkOtpAttempts,
  handleAsync,
  checkVerifyAttempts,
  sendEmailOtpResponse,
} = require("../utils/attemptAndOtp");

// Send Employee OTP
exports.sendEmployeeOtp = handleAsync(async (req, res) => {
  const formattedEmail = formatAndValidateEmail(req.body.email);
  const sendKey = `Employee_email_otp_send_attempts:${formattedEmail}`;
  const MAX_ATTEMPTS = parseInt(process.env.OTP_SEND_ATTEMPTS, 10);

  if (await checkOtpAttempts(formattedEmail, sendKey, MAX_ATTEMPTS, res))
    return;

  await sendEmailOtpResponse(
    formattedEmail,
    "Employee Registeration OTP",
    "EmployeeRegisterOTP",
    (user = {}),
    res
  );
});

// resend Employee OTP
exports.resendEmployeeOtp = handleAsync(async (req, res) => {
  const formattedEmail = formatAndValidateEmail(req.body.email);
  const resendKey = `Employee_email_otp_resend_attempts:${formattedEmail}`;
  const MAX_ATTEMPTS = parseInt(process.env.OTP_RESEND_ATTEMPTS, 10) + 1;

  if (await checkOtpAttempts(formattedEmail, resendKey, MAX_ATTEMPTS, res))
    return;

  await sendEmailOtpResponse(
    formattedEmail,
    "Employee Registeration OTP",
    "EmployeeRegisterOTP",
    (user = {}),
    res
  );
});

// Verify formattedEmail
exports.verifyEmployeeOtp = handleAsync(async (req, res) => {
  const formattedEmail = formatAndValidateEmail(req.body.email);
  const { otp } = req.body;
  await connectRedis();

  const attemptKey = `Employee_email_verification_attempts:${formattedEmail}`;
  const MAX_ATTEMPTS = parseInt(process.env.Email_VERIFICATION_ATTEMPTS, 10);

  if (await checkVerifyAttempts(formattedEmail, attemptKey, MAX_ATTEMPTS, res))
    return;

  const storedOTP = await client.get(`EmployeeRegisterOTP:${formattedEmail}`);
  if (!storedOTP || storedOTP !== otp) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  // Clean up Attempt related keys after successful formattedEmail verification
  await cleanupAttemptKeys(formattedEmail);

  return res.status(200).json({ message: "Email verified successfully!" });
});

// Register Employee
exports.registerEmployee = handleAsync(async (req, res) => {
  const formattedEmail = formatAndValidateEmail(req.body.email);
  const { name, mobile, password, employeeCode } = req.body;

  // Check for required fields
  if (!mobile || !formattedEmail || !name || !password || !employeeCode) {
    return res
      .status(400)
      .json({ message: "All required fields must be provided." });
  }

  // Check if user already exists with same mobile or email
  let existingUser = await Employee.findOne({
    $or: [
      { mobile: mobile },
      { email: formattedEmail },
      { employeeCode: employeeCode },
    ],
  });

  if (existingUser) {
    return res.status(409).json({
      message:
        "User already registered with this mobile, email or employee code. Please log in.",
    });
  }

  const hashedPassword = await bcrypt.hash(
    password,
    parseInt(process.env.BCRYPT_SALT_ROUNDS, 10)
  );

  const newEmployee = new Employee({
    name: Object({ en: name }),
    employeeCode,
    mobile: mobile,
    email: formattedEmail,
    password: hashedPassword,
  });

  await newEmployee.save();

  signInToken(newEmployee, "7d");

  console.info(`User Registered: ${mobile}`);

  await cleanupAttemptKeys(mobile);
  await cleanupAttemptKeys(formattedEmail);

  return res.status(201).json({
    message: "Registration successful",
  });
});

exports.loginEmployee = handleAsync(async (req, res) => {
  const { email, password } = req.body;

  // Validate and format email
  const formattedEmail = formatAndValidateEmail(email);
  if (!formattedEmail) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  // Check if the current time is within allowed login hours (9 AM to 9 PM IST)
  const currentTime = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istTime = new Date(currentTime.getTime() + istOffset);
  const istHours = istTime.getUTCHours();
  const istMinutes = istTime.getUTCMinutes();

  // Convert current time to decimal hours for easy comparison (e.g., 9:30 = 9.5)
  const currentHourDecimal = istHours + istMinutes / 60;

  if (currentHourDecimal < 9) {
    return res.status(403).json({
      error: "Login is only allowed after 9 AM Indian Standard Time.",
    });
  }

  // Find the user by email and convert to a plain object using .lean()
  const user = await Employee.findOne({ email: formattedEmail }).lean();
  if (!user) {
    return res
      .status(404)
      .json({ error: "User not found. Please register first." });
  }

  const attemptKey = `Employee_login_attempts:${user.email}`;
  const MAX_ATTEMPTS = parseInt(process.env.USER_LOGIN_ATTEMPTS, 10);

  // Check if the user exceeded login attempts
  if (await checkVerifyAttempts(user.email, attemptKey, MAX_ATTEMPTS, res))
    return;

  // Validate password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  // Send OTP to admin emails for verification
  try {
    sendLoginVerificationOTP(user);

    // Remove password from the response
    delete user.password;

    // Return user details for the frontend to use in verification
    return res.status(200).json({
      message:
        "Credentials verified. Please enter the verification code sent to administrators.",
      requiresOtp: true,
      userId: user._id,
      email: user.email,
    });
  } catch (error) {
    console.error("Error in admin OTP sending:", error);
    return res.status(500).json({
      error:
        "Failed to send verification code to administrators. Please try again later.",
    });
  }
});

// Verify Login OTP from admin for final login
exports.verifyLoginAdminOtp = handleAsync(async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return res.status(400).json({ error: "User ID and OTP are required" });
  }

  // Verify the OTP
  const isValidOtp = await verifyLoginOTP(userId, otp);

  if (!isValidOtp) {
    return res.status(401).json({ error: "Invalid or expired OTP" });
  }

  // Fetch the user to create token and complete login
  const user = await Employee.findById(userId).lean();
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Generate JWT token
  const token = signInToken(user, "7d");

  // Close only "On Desk" active activities
  await Activity.updateMany(
    { employeeId: user._id, type: "On Desk", endTime: null },
    { endTime: new Date() }
  );

  // Set today's date to start of day for accurate comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if the employee has an approved leave that covers today
  const leave = await Leave.findOne({
    employee: user._id,
    startDate: { $lte: today },
    endDate: { $gte: today },
    status: "Approved",
  });

  // Check if attendance already marked for today
  let attendanceRecord = await Attendance.findOne({
    employee: user._id,
    date: {
      $gte: today,
      $lt: tomorrow,
    },
  });

  // If no attendance record for today, create one
  if (!attendanceRecord) {
    attendanceRecord = new Attendance({
      employee: user._id,
      date: today,
      present: !leave, // If on leave, not present
      leaveId: leave ? leave._id : null,
    });
    await attendanceRecord.save();
  }

  // Create a new "On Desk" activity only if not on approved leave
  let currentActivity = null;
  if (!leave) {
    currentActivity = new Activity({
      employeeId: user._id,
      type: "On Desk",
      startTime: new Date(),
    });
    await currentActivity.save();
  }

  // Cleanup login attempt tracking
  await cleanupAttemptKeys(user.email);

  // Remove password from the response
  delete user.password;

  const { data, iv } = handleEncryptData([...user?.access_list, user.role]);

  return res.status(200).json({
    message: "Login successful",
    user,
    token,
    role: user.role,
    data,
    iv,
    attendance: {
      present: attendanceRecord.present,
      date: attendanceRecord.date,
      leaveDetails: leave
        ? {
            type: leave.leaveType,
            reason: leave.leaveReason,
          }
        : null,
    },
    activity: {
      currentActivity,
      shouldBlock: false,
    },
  });
});

// Forgot Password
exports.forgotEmployeePassword = handleAsync(async (req, res) => {
  const formattedEmail = formatAndValidateEmail(req.body.email);

  const forgotKey = `Forgot_Employee_password_attempts:${formattedEmail}`;
  const MAX_ATTEMPTS = parseInt(process.env.FORGOT_PASSWORD_ATTEMPTS, 10);

  const user = await Employee.findOne({ email: formattedEmail });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (await checkOtpAttempts(formattedEmail, forgotKey, MAX_ATTEMPTS, res))
    return;
  await sendEmailOtpResponse(
    formattedEmail,
    "Employee Password Reset OTP",
    "resetEmployeePasswordOTP",
    user,
    res
  );
});

// resend Forgot Password OTP
exports.resendEmployeeForgotPasswordOtp = handleAsync(async (req, res) => {
  const formattedEmail = formatAndValidateEmail(req.body.email);
  const user = await Employee.findOne({ email: formattedEmail });
  const forgotKey = `Forgot_Employee_password_attempts:${formattedEmail}`;
  const MAX_ATTEMPTS = parseInt(process.env.FORGOT_PASSWORD_ATTEMPTS, 10);

  if (!user) return res.status(404).json({ error: "User not found" });

  if (await checkOtpAttempts(formattedEmail, forgotKey, MAX_ATTEMPTS, res))
    return;
  await sendEmailOtpResponse(
    formattedEmail,
    "Employee Password Reset OTP",
    "resetEmployeePasswordOTP",
    user,
    res
  );
});

// Reset Password
exports.resetEmployeePassword = handleAsync(async (req, res) => {
  const formattedEmail = formatAndValidateEmail(req.body.email);
  const { otp, newPassword } = req.body;
  const storedOTP = await client.get(
    `resetEmployeePasswordOTP:${formattedEmail}`
  );

  const attemptKey = `Reset_Employee_password_attempts:${formattedEmail}`;
  const MAX_ATTEMPTS = parseInt(process.env.RESET_PASSWORD_ATTEMPTS, 10);

  if (await checkVerifyAttempts(formattedEmail, attemptKey, MAX_ATTEMPTS, res))
    return;

  if (!storedOTP || storedOTP !== otp) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(
    newPassword,
    parseInt(process.env.BCRYPT_SALT_ROUNDS, 10)
  );

  // Atomically update only the password field
  const user = await Employee.findOneAndUpdate(
    { email: formattedEmail },
    { password: hashedPassword },
    { new: true, runValidators: true }
  );
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Clean up OTP related keys after successful password reset
  await cleanupAttemptKeys(formattedEmail);

  return res.status(200).json({ message: "Password reset successful!" });
});

// Request formattedEmail Verification
exports.requestEmployeeEmailVerification = handleAsync(async (req, res) => {
  const formattedEmail = formatAndValidateEmail(req.body.email);
  const formattedEmailKey = `Employee_email_verify_otp_attempts:${formattedEmail}`;
  const MAX_ATTEMPTS = parseInt(process.env.VERIFY_EMAIL_OTP_ATTEMPTS, 10);

  const user = await Employee.findOne({ email: formattedEmail });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (
    await checkOtpAttempts(formattedEmail, formattedEmailKey, MAX_ATTEMPTS, res)
  )
    return;
  await sendEmailOtpResponse(
    formattedEmail,
    "Email Verification OTP",
    "EmployeeEmailVerificationOTP",
    user,
    res
  );
});

// Resend OTP
exports.resendEmployeeVerifyEmailOtp = handleAsync(async (req, res) => {
  const formattedEmail = formatAndValidateEmail(req.body.email);
  const resendKey = `Employee_verify_email_otp_resend_attempts:${formattedEmail}`;
  const MAX_ATTEMPTS =
    parseInt(process.env.VERIFY_EMAIL_OTP_RESEND_ATTEMPTS, 10) + 1;

  const user = await Employee.findOne({ email: formattedEmail });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (await checkOtpAttempts(formattedEmail, resendKey, MAX_ATTEMPTS, res))
    return;
  await sendEmailOtpResponse(
    formattedEmail,
    "Email Verification OTP",
    "EmployeeEmailVerificationOTP",
    user,
    res
  );
});

// Verify formattedEmail
exports.verifyEmployeeEmail = handleAsync(async (req, res) => {
  const formattedEmail = formatAndValidateEmail(req.body.email);
  const { otp } = req.body;
  await connectRedis();

  const attemptKey = `Employee_email_verification_attempts:${formattedEmail}`;
  const MAX_ATTEMPTS = parseInt(process.env.Email_VERIFICATION_ATTEMPTS, 10);

  if (await checkVerifyAttempts(formattedEmail, attemptKey, MAX_ATTEMPTS, res))
    return;

  const storedOTP = await client.get(
    `EmployeeEmailVerificationOTP:${formattedEmail}`
  );
  if (!storedOTP || storedOTP !== otp) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  const user = await Employee.findOne({ email: formattedEmail });
  if (!user) return res.status(404).json({ error: "User not found" });

  user.isEmailVerified = true;
  await user.save();

  // Clean up Attempt related keys after successful formattedEmail verification
  await cleanupAttemptKeys(formattedEmail);

  return res.status(200).json({ message: "Email verified successfully!" });
});

// Logout Employee
exports.logoutEmployee = handleAsync(async (req, res) => {
  try {
    const employeeId = req.employee._id;

    // Close all active activities for this employee
    await closeAllActiveActivities(employeeId);

    // Send logout report to admins (non-blocking)
    sendLogoutReport(employeeId).catch((error) => {
      console.error("Error sending logout report in background:", error);
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful. All activities have been closed.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Error during logout",
      error: error.message,
    });
  }
});
