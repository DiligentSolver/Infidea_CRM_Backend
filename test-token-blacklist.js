require("dotenv").config();
const {
  blacklistToken,
  isTokenBlacklisted,
  blacklistAllTokens,
  isGlobalBlacklistActive,
} = require("./utils/tokenBlacklist");
const jwt = require("jsonwebtoken");

// Create a test token
const createTestToken = () => {
  return jwt.sign({ _id: "test-user-id" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

// Run tests
const runTests = async () => {
  try {
    console.log("Testing token blacklist functionality...");

    // Test 1: Create a token and check it's not blacklisted
    const token = createTestToken();
    console.log("Created test token:", token);

    let isBlacklisted = await isTokenBlacklisted(token);
    console.log("Is token blacklisted before blacklisting:", isBlacklisted);

    // Test 2: Blacklist the token and verify
    await blacklistToken(token);
    isBlacklisted = await isTokenBlacklisted(token);
    console.log("Is token blacklisted after blacklisting:", isBlacklisted);

    // Test 3: Check global blacklist when inactive
    let isGlobalBlacklist = await isGlobalBlacklistActive();
    console.log(
      "Is global blacklist active before activating:",
      isGlobalBlacklist
    );

    // Test 4: Activate global blacklist and verify
    await blacklistAllTokens();
    isGlobalBlacklist = await isGlobalBlacklistActive();
    console.log(
      "Is global blacklist active after activating:",
      isGlobalBlacklist
    );

    console.log("All tests completed!");
    process.exit(0);
  } catch (error) {
    console.error("Error during tests:", error);
    process.exit(1);
  }
};

// Run the tests
runTests();
