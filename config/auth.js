require("dotenv").config();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const moment = require("moment-timezone");
const { IST_TIMEZONE } = require("../utils/dateUtils");

const secretKey = process.env.ENCRYPT_PASSWORD;

// Ensure the secret key is exactly 32 bytes (256 bits)
const key = crypto.createHash("sha256").update(secretKey).digest();

// Generate an initialization vector (IV)
const iv = crypto.randomBytes(16); // AES-CBC requires a 16-byte IV

// Helper function to encrypt data
const handleEncryptData = (data) => {
  // Ensure the input is a string or convert it to a string
  const dataToEncrypt = typeof data === "string" ? data : JSON.stringify(data);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encryptedData = cipher.update(dataToEncrypt, "utf8", "hex");
  encryptedData += cipher.final("hex");

  return {
    data: encryptedData,
    iv: iv.toString("hex"),
  };
};

const signInToken = (user) => {
  // Calculate next 9pm IST
  const now = moment().tz(IST_TIMEZONE);
  let next9pm = now
    .clone()
    .set({ hour: 21, minute: 0, second: 0, millisecond: 0 });
  if (now.isAfter(next9pm)) {
    next9pm.add(1, "day");
  }
  const exp = next9pm.unix(); // JWT expects seconds since epoch

  return jwt.sign(
    {
      _id: user._id,
      exp,
    },
    process.env.JWT_SECRET
  );
};

module.exports = { handleEncryptData, signInToken };
