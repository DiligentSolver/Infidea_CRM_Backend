const sendEmail = require("./emailService");
const { generateOTP } = require("./otpGenerator");
const adminLoginOtpTemplate = require("./emailTemplates/adminLoginOtpTemplate");
const adminLogoutNotificationTemplate = require("./emailTemplates/adminLogoutNotificationTemplate");
const { client, connectRedis } = require("./redisClient");
const { formatDate, toLocaleTimeString } = require("./dateUtils");

/**
 * Send login OTP to admin emails for employee verification
 * @param {Object} employee - Employee details
 * @returns {String} - Generated OTP
 */
const sendLoginVerificationOTP = async (employee) => {
  if (!employee) {
    throw new Error("Employee details are required");
  }

  await connectRedis();

  // Generate OTP
  const otp = generateOTP();

  // Current date and time formatted using dateUtils
  const currentTime = `${formatDate(
    new Date(),
    "DD/MM/YYYY"
  )} ${toLocaleTimeString(new Date())}`;

  // Get admin emails from env variables
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminEmail = process.env.ADMIN_EMAIL;
  const supervisorEmail = process.env.SUPERVISOR_EMAIL;

  // Create email content with HTML template
  const emailHtml = adminLoginOtpTemplate(employee, otp, currentTime);

  // Construct list of recipients
  const recipients = [superAdminEmail, adminEmail, supervisorEmail].filter(
    (email) => email && email.trim() !== ""
  );

  if (recipients.length === 0) {
    throw new Error("No admin emails configured in environment variables");
  }

  // Store OTP in Redis with expiry time (default 10 minutes)
  const otpExpiry = parseInt(process.env.OTP_EXPIRY || 10) * 60; // Convert to seconds
  const otpKey = `loginVerificationOTP:${employee._id}`;

  await client.setEx(otpKey, otpExpiry, otp);

  // Send email to all admin recipients
  try {
    for (const recipientEmail of recipients) {
      await sendEmail(
        recipientEmail,
        `Login Verification Required - ${
          employee.name?.en || employee.name || employee.email
        }`,
        emailHtml,
        true // isHtml flag
      );
    }

    console.info(
      `Login verification OTP sent to admins for employee: ${employee.email}`
    );
    return otp; // Return OTP for testing purposes
  } catch (error) {
    console.error("Error sending admin verification emails:", error);
    throw new Error("Failed to send verification emails to admins");
  }
};

/**
 * Send logout notification to admin emails
 * @param {Object} employee - Employee details
 * @returns {Boolean} - True if emails were sent successfully
 */
const sendLogoutNotification = async (employee) => {
  if (!employee) {
    throw new Error("Employee details are required");
  }

  // Current date and time formatted using dateUtils
  const logoutTime = `${formatDate(
    new Date(),
    "DD/MM/YYYY"
  )} ${toLocaleTimeString(new Date())}`;

  // Get admin emails from env variables
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminEmail = process.env.ADMIN_EMAIL;
  const supervisorEmail = process.env.SUPERVISOR_EMAIL;

  // Create email content with HTML template
  const emailHtml = adminLogoutNotificationTemplate(employee, logoutTime);

  // Construct list of recipients
  const recipients = [superAdminEmail, adminEmail, supervisorEmail].filter(
    (email) => email && email.trim() !== ""
  );

  if (recipients.length === 0) {
    throw new Error("No admin emails configured in environment variables");
  }

  // Send email to all admin recipients
  try {
    for (const recipientEmail of recipients) {
      await sendEmail(
        recipientEmail,
        `Logout Notification - ${
          employee.name?.en || employee.name || employee.email
        }`,
        emailHtml,
        true // isHtml flag
      );
    }

    console.info(
      `Logout notification sent to admins for employee: ${employee.email}`
    );
    return true;
  } catch (error) {
    console.error("Error sending admin logout notifications:", error);
    // Don't throw error to prevent affecting the logout process
    return false;
  }
};

/**
 * Verify login OTP for employee
 * @param {String} employeeId - Employee ID
 * @param {String} otp - OTP to verify
 * @returns {Boolean} - True if OTP is valid
 */
const verifyLoginOTP = async (employeeId, otp) => {
  if (!employeeId || !otp) {
    throw new Error("Employee ID and OTP are required");
  }

  await connectRedis();

  const otpKey = `loginVerificationOTP:${employeeId}`;
  const storedOTP = await client.get(otpKey);

  if (!storedOTP || storedOTP !== otp) {
    return false;
  }

  // Delete the OTP after successful verification
  await client.del(otpKey);
  return true;
};

module.exports = {
  sendLoginVerificationOTP,
  verifyLoginOTP,
  sendLogoutNotification,
};
