require("dotenv").config();
const jwt = require("jsonwebtoken");
const { signInToken } = require("./config/auth");

// Create a fake user object
const testUser = {
  _id: "test-user-id",
};

// Create and analyze token
const testTokenExpiry = () => {
  // Create token
  const token = signInToken(testUser);
  console.log("Created token:", token);

  // Decode token to verify expiry
  const decoded = jwt.decode(token);

  // Calculate expiry
  const issuedAt = new Date(decoded.iat * 1000);
  const expiresAt = new Date(decoded.exp * 1000);
  const expiryDurationMs = expiresAt - issuedAt;
  const expiryDurationHours = expiryDurationMs / (1000 * 60 * 60);

  console.log("Token issued at:", issuedAt.toISOString());
  console.log("Token expires at:", expiresAt.toISOString());
  console.log("Token duration in hours:", expiryDurationHours);

  // Verify it's close to 12 hours (within a small margin of error)
  if (Math.abs(expiryDurationHours - 12) < 0.1) {
    console.log("✅ Token expiry is correctly set to 12 hours");
  } else {
    console.log(
      "❌ Token expiry is NOT 12 hours, actual hours:",
      expiryDurationHours
    );
  }
};

// Run test
testTokenExpiry();
