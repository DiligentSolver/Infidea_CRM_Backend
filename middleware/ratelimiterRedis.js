const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { client, connectRedis } = require("../utils/redisClient");

// Initialize Redis connection
connectRedis();

const limiter = rateLimit({
  // Generate a unique key for each request based on the IP address
  keyGenerator: (req) => req.ip,
  store: new RedisStore({
    sendCommand: async (...args) => client.sendCommand(args),
    prefix: "rl:",
  }),
  windowMs: 15 * 60 * 1000, // 10 minutes
  max: 100, // Limit each IP to 50 requests per 10 minutes
  standardHeaders: true, // Send rate limit headers in response
  legacyHeaders: false, // Disable deprecated headers
  message: {
    success: false,
    message: "Too many requests, please slow down.",
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, please slow down.",
    });
  },
});

module.exports = limiter;
