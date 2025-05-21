const { client, connectRedis } = require("../utils/redisClient");
const { generateOTP } = require("../utils/otpGenerator");
const sendEmail = require("../utils/emailService");
const { sendOTP } = require("../utils/sendOtp");
const bcrypt = require("bcryptjs");
const { sendFastOTP } = require("../utils/fast2SmsOtp");

// Get the APP_NAME from environment variables
const APP_NAME = process.env.APP_NAME || "Infidea CRM";

// Utility function to handle async errors
const handleAsync = (fn) => async (req, res) => {
  try {
    await connectRedis();
    await fn(req, res);
  } catch (err) {
    console.error(`[${new Date().toISOString()}]`, err);
    res.status(500).json({ error: err.message });
  }
};

// Utility function to check OTP attempts and block if exceeded
const checkOtpAttempts = async (identifier, key, maxAttempts, res) => {
  const TEN_MINUTES = 600;
  const TWENTY_FOUR_HOURS = 86400;

  await connectRedis();

  await client.del(key);

  let attempts = parseInt(await client.get(key)) || 0;

  // Increment the key only if it's less than MAX_ATTEMPTS * 2
  if (attempts <= maxAttempts * 2) {
    await client.incr(key);
  }

  if (attempts >= maxAttempts) {
    let blockDuration;
    let blockMessage;
    let remainingTime = await client.ttl(key); // Get the remaining TTL in seconds

    console.info(attempts);

    if (attempts < maxAttempts * 2) {
      blockDuration = TEN_MINUTES;
      blockMessage = "Try again in 10 minutes.";
    } else {
      blockDuration = TWENTY_FOUR_HOURS;
      blockMessage = "Blocked for 24 hours.";
    }

    // Set the expiry only when attempts reach maxAttempts or maxAttempts * 2
    if (attempts === maxAttempts || attempts === maxAttempts * 2) {
      await client.expire(key, blockDuration);
    }

    if (
      remainingTime > 0 &&
      attempts != maxAttempts &&
      attempts != maxAttempts * 2
    ) {
      // If TTL is set, show the remaining time in seconds
      blockMessage =
        remainingTime <= TEN_MINUTES
          ? `Blocked. Try again in ${parseInt(remainingTime / 60)} min.`
          : `Blocked. Try again in ${parseInt(remainingTime / 3600)} hour.`;
    }

    console.warn(`OTP Blocked for ${identifier}: ${blockMessage}`);
    return res.status(429).json({ message: blockMessage });
  }

  await client.incr(key);
  return false;
};

const checkVerifyAttempts = async (identifier, key, maxAttempts, res) => {
  const TEN_MINUTES = 600;
  const TWENTY_FOUR_HOURS = 86400;

  await connectRedis();

  await client.del(key);

  let attempts = parseInt(await client.get(key)) || 0;

  // Increment the key only if it's less than MAX_ATTEMPTS * 2
  if (attempts <= maxAttempts * 2) {
    await client.incr(key);
  }

  if (attempts >= maxAttempts) {
    let blockDuration;
    let blockMessage;
    let remainingTime = await client.ttl(key); // Get the remaining TTL in seconds

    console.info(attempts);

    if (attempts < maxAttempts * 2) {
      blockDuration = TEN_MINUTES;
      blockMessage = "Try again in 10 minutes.";
    } else {
      blockDuration = TWENTY_FOUR_HOURS;
      blockMessage = "Blocked for 24 hours.";
    }

    // Set the expiry only when attempts reach maxAttempts or maxAttempts * 2
    if (attempts === maxAttempts || attempts === maxAttempts * 2) {
      await client.expire(key, blockDuration);
    }

    if (
      remainingTime > 0 &&
      attempts != maxAttempts &&
      attempts != maxAttempts * 2
    ) {
      // If TTL is set, show the remaining time in seconds
      blockMessage =
        remainingTime <= TEN_MINUTES
          ? `Blocked. Try again in ${parseInt(remainingTime / 60)} min.`
          : `Blocked. Try again in ${parseInt(remainingTime / 3600)} hour.`;
    }

    console.warn(`Verification Blocked for ${identifier}: ${blockMessage}`);
    return res.status(429).json({ message: blockMessage, remainingTime });
  }

  return false;
};

// Send OTP response
const sendOtpResponse = async (mobile, res) => {
  try {
    const otp = generateOTP();
    sendOTP(mobile, otp);

    const hashedOtp = await bcrypt.hash(otp, 10);

    // sendFastOTP(mobile, otp);

    await client.setEx(
      `otp:${mobile}`,
      parseInt(process.env.OTP_EXPIRY) * 60,
      hashedOtp
    );

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error sending OTP." });
  }
};

// Send OTP response
const sendEmailOtpResponse = async (email, subject, otpKey, user = {}, res) => {
  try {
    // Generate and store OTP
    const otp = generateOTP();
    const otpExpiry = parseInt(process.env.OTP_EXPIRY) * 60; // Convert to seconds

    // Store OTP in Redis with a 10-minute expiration
    await client.setEx(`${otpKey}:${email}`, otpExpiry, otp);

    // Determine recipient email (use `email` if `user.email` is not available)
    const recipientEmail = user?.email || email;

    // Create HTML email template based on the OTP type
    let emailContent;
    let templateTitle = "";
    let templateMessage = "";

    // Customize the template content based on OTP type
    if (otpKey === "resetEmployeePasswordOTP") {
      templateTitle = "Password Reset Request";
      templateMessage =
        "We received a request to reset your password. Please use the following verification code to complete the process:";
    } else if (otpKey === "EmployeeRegisterOTP") {
      templateTitle = "Account Registration";
      templateMessage =
        "Thank you for registering with us. Please use the following verification code to complete your registration:";
    } else if (otpKey === "EmployeeEmailVerificationOTP") {
      templateTitle = "Email Verification";
      templateMessage =
        "Please use the following verification code to verify your email address:";
    } else {
      templateTitle = "Verification Code";
      templateMessage = "Please use the following verification code:";
    }

    // Create a standardized HTML template for all OTP emails
    emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #333;">${APP_NAME}</h2>
          <h3 style="color: #555;">${templateTitle}</h3>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
          <p>Hello ${user?.name?.en || "there"},</p>
          <p>${templateMessage}</p>
          <div style="text-align: center; margin: 25px 0;">
            <div style="background-color: #f0f0f0; padding: 12px; border-radius: 5px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
              ${otp}
            </div>
          </div>
          <p>This code will expire in ${process.env.OTP_EXPIRY} minutes.</p>
          <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
        </div>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #777; text-align: center;">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `;

    // Send OTP via email with HTML formatting
    await sendEmail(recipientEmail, subject, emailContent, true);

    console.info(`OTP Sent to ${recipientEmail}: ${otp}`);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error sending OTP." });
  }
};

module.exports = {
  checkOtpAttempts,
  sendOtpResponse,
  handleAsync,
  checkVerifyAttempts,
  sendEmailOtpResponse,
};
