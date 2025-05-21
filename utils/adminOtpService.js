const sendEmail = require("./emailService");
const { generateOTP } = require("./otpGenerator");
const adminLoginOtpTemplate = require("./emailTemplates/adminLoginOtpTemplate");
const adminLogoutNotificationTemplate = require("./emailTemplates/adminLogoutNotificationTemplate");
const { client, connectRedis } = require("./redisClient");
const { formatDate, toLocaleTimeString } = require("./dateUtils");
const geoip = require("geoip-lite");
const axios = require("axios");

/**
 * Get location information from IP using DB-IP API
 * @param {String} ip - IP address
 * @returns {Promise<String>} - Location string
 */
const getLocationFromIp = async (ip) => {
  // Handle localhost IPs
  if (ip === "::1" || ip === "127.0.0.1" || ip.includes("localhost")) {
    return "Internal Access";
  }

  try {
    // Try DB-IP API first (free tier, limited to 1000 requests per day)
    const response = await axios.get(`https://api.db-ip.com/v2/free/${ip}`);

    if (response.data && response.data.city) {
      // Build location string with as much detail as available
      const locationParts = [];

      if (response.data.city) locationParts.push(response.data.city);
      if (response.data.stateProv) locationParts.push(response.data.stateProv);
      if (response.data.countryName)
        locationParts.push(response.data.countryName);

      return locationParts.join(", ");
    }
  } catch (error) {
    console.error("Error using DB-IP API for location lookup:", error.message);
    // Fall back to geoip-lite if DB-IP fails
    try {
      const geo = geoip.lookup(ip);
      if (geo) {
        const locationParts = [];
        if (geo.city) locationParts.push(geo.city);
        if (geo.region) locationParts.push(geo.region);
        if (geo.country) locationParts.push(geo.country);

        return locationParts.length > 0
          ? locationParts.join(", ")
          : "Unknown Location";
      }
    } catch (geoipError) {
      console.error("Error using geoip-lite fallback:", geoipError.message);
    }
  }

  return "Unknown Location";
};

/**
 * Send login OTP to admin emails for employee verification
 * @param {Object} employee - Employee details
 * @param {String} ipAddress - IP address of the employee
 * @returns {String} - Generated OTP
 */
const sendLoginVerificationOTP = async (employee, ipAddress) => {
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

  // Handle IP address and location
  let displayIp = ipAddress || "Unknown";

  // Get location using the new DB-IP based function
  const locationInfo = await getLocationFromIp(ipAddress);

  // Get admin emails from env variables
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminEmail = process.env.ADMIN_EMAIL;
  const supervisorEmail = process.env.SUPERVISOR_EMAIL;

  // Create email content with HTML template
  const emailHtml = adminLoginOtpTemplate(
    employee,
    otp,
    currentTime,
    displayIp,
    locationInfo
  );

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
 * @param {String} ipAddress - IP address of the employee
 * @returns {Boolean} - True if emails were sent successfully
 */
const sendLogoutNotification = async (employee, ipAddress) => {
  if (!employee) {
    throw new Error("Employee details are required");
  }

  // Current date and time formatted using dateUtils
  const logoutTime = `${formatDate(
    new Date(),
    "DD/MM/YYYY"
  )} ${toLocaleTimeString(new Date())}`;

  // Handle IP address and location
  let displayIp = ipAddress || "Unknown";

  // Get location using the new DB-IP based function
  const locationInfo = await getLocationFromIp(ipAddress);

  // Get admin emails from env variables
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminEmail = process.env.ADMIN_EMAIL;
  const supervisorEmail = process.env.SUPERVISOR_EMAIL;

  // Create email content with HTML template
  const emailHtml = adminLogoutNotificationTemplate(
    employee,
    logoutTime,
    displayIp,
    locationInfo
  );

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
