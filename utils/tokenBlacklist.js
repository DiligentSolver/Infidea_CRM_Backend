const { client, connectRedis } = require("./redisClient");
const jwt = require("jsonwebtoken");

/**
 * Add a token to the blacklist
 * @param {string} token - The JWT token to blacklist
 * @param {number} expiryInSeconds - How long until the token expires (in seconds)
 */
const blacklistToken = async (token) => {
  try {
    await connectRedis();

    // Decode token to get expiry time
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      console.error("Invalid token or missing expiry");
      return false;
    }

    // Calculate remaining time until token expiry
    const now = Math.floor(Date.now() / 1000);
    const expiryInSeconds = decoded.exp - now;

    // If token is already expired, no need to blacklist
    if (expiryInSeconds <= 0) {
      return true;
    }

    // Add token to blacklist with expiry matching the token's expiry
    await client.setEx(`blacklist:${token}`, expiryInSeconds, "1");
    return true;
  } catch (error) {
    console.error("Error blacklisting token:", error);
    return false;
  }
};

/**
 * Check if a token is blacklisted
 * @param {string} token - The JWT token to check
 * @returns {Promise<boolean>} - True if token is blacklisted
 */
const isTokenBlacklisted = async (token) => {
  try {
    await connectRedis();
    const result = await client.get(`blacklist:${token}`);
    return result !== null;
  } catch (error) {
    console.error("Error checking token blacklist:", error);
    return false;
  }
};

/**
 * Blacklist all active tokens for all employees
 * Called at 9 PM to enforce logout
 */
const blacklistAllTokens = async () => {
  try {
    await connectRedis();

    // Create a system-level blacklist flag that expires at midnight
    // This is more efficient than trying to track and blacklist individual tokens
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    // Calculate seconds until midnight
    const secondsUntilMidnight = Math.floor((midnight - now) / 1000);

    // Set global blacklist flag
    await client.setEx(
      "global:token:blacklist",
      secondsUntilMidnight,
      Date.now().toString()
    );

    console.log(
      `Global token blacklist activated until midnight (${secondsUntilMidnight} seconds)`
    );
    return true;
  } catch (error) {
    console.error("Error setting global token blacklist:", error);
    return false;
  }
};

/**
 * Check if global token blacklist is active
 * @returns {Promise<boolean>} - True if global blacklist is active
 */
const isGlobalBlacklistActive = async () => {
  try {
    await connectRedis();
    const result = await client.get("global:token:blacklist");
    return result !== null;
  } catch (error) {
    console.error("Error checking global token blacklist:", error);
    return false;
  }
};

module.exports = {
  blacklistToken,
  isTokenBlacklisted,
  blacklistAllTokens,
  isGlobalBlacklistActive,
};
