const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // Limit each IP to 50 requests per 10 minutes
  standardHeaders: true, // Enables `RateLimit` headers in the response
  legacyHeaders: false, // Disables `X-RateLimit-*` headers (for better security)
  message: {
    success: false,
    message: "Too many requests, please slow down.",
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "You have exceeded the allowed request limit. Try again later.",
    });
  },
});

module.exports = limiter;
