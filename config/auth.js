require("dotenv").config();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

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

const signInToken = (user, expiresIn) => {
  return jwt.sign(
    {
      _id: user._id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: expiresIn || "12h",
    }
  );
};

module.exports = { handleEncryptData, signInToken };
