const jwt = require("jsonwebtoken");
const Employee = require("../models/employeeModel");
const {
  isTokenBlacklisted,
  isGlobalBlacklistActive,
} = require("../utils/tokenBlacklist");

// Middleware to verify employee token
const authMiddleware = async (req, res, next) => {
  try {
    let token;

    //Check for token in headers (Mobile App)
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    //If no token found, return error
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: Token missing" });
    }

    // Check if token is blacklisted (specifically blacklisted or global blacklist is active)
    const [isBlacklisted, isGlobalBlacklist] = await Promise.all([
      isTokenBlacklisted(token),
      isGlobalBlacklistActive(),
    ]);

    if (isBlacklisted || isGlobalBlacklist) {
      return res.status(401).json({
        message: isGlobalBlacklist
          ? "Unauthorized: System has been logged out for the day. Please login again tomorrow."
          : "Unauthorized: Token has been invalidated. Please login again.",
      });
    }

    //Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const employee = await Employee.findById(decoded._id).select(
      "_id userRole"
    );
    req.employee = employee;
    req.token = token; // Store token in request for possible blacklisting later
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }
};

// Middleware for Role-Based Access
const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.employee || !roles.includes(req.employee.userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

module.exports = { authMiddleware, roleMiddleware };
