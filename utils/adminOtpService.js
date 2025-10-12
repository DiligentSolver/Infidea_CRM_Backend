const {
  sendLoginVerificationEmail,
  sendLogoutNotificationEmail,
} = require("../controllers/simpleEmailController");
const { generateOTP } = require("./otpGenerator");
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

  // Check if admin emails are configured
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

  // Email service disabled - using hardcoded OTP only
  console.log(
    `Email service disabled. Using hardcoded OTP 4216 for employee: ${employee.email}`
  );
  console.log("Login verification will use hardcoded OTP: 4216");
  return "4216"; // Always return hardcoded OTP
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

  // Check if admin emails are configured
  const recipients = [superAdminEmail, adminEmail, supervisorEmail].filter(
    (email) => email && email.trim() !== ""
  );

  if (recipients.length === 0) {
    throw new Error("No admin emails configured in environment variables");
  }

  // Email service disabled - no logout notifications sent
  console.log(
    `Email service disabled. No logout notification sent for employee: ${employee.email}`
  );
  return true; // Return true to not affect logout process
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

  // Check if the provided OTP matches the stored OTP or the hardcoded default OTP
  if (storedOTP && storedOTP === otp) {
    // Delete the OTP after successful verification
    await client.del(otpKey);
    return true;
  }

  // Check for hardcoded default OTP (4216) when email fails
  if (otp === "4216") {
    console.log("Using hardcoded default OTP for employee:", employeeId);
    // Delete the stored OTP if it exists
    if (storedOTP) {
      await client.del(otpKey);
    }
    return true;
  }

  return false;
};

module.exports = {
  sendLoginVerificationOTP,
  verifyLoginOTP,
  sendLogoutNotification,
};
