const { client, connectRedis } = require("../utils/redisClient");
const { generateOTP } = require("../utils/otpGenerator");
const sendEmail = require("../utils/emailService");
const { sendOTP } = require("../utils/sendOtp");
const bcrypt = require("bcryptjs");
const { sendFastOTP } = require("../utils/fast2SmsOtp");

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
    // Send OTP via email
    await sendEmail(recipientEmail, subject, `Your OTP is: ${otp}`);

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
