const jwt = require("jsonwebtoken");
const Employee = require("../models/employeeModel");

// Authentication middleware
exports.authenticateToken = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      // Check for token in cookies
      token = req.cookies.token;
    }

    // If no token found, return error
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token missing",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await Employee.findById(decoded._id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found",
      });
    }

    // Set user info in request
    req.user = user;
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
    });
  }
};

// Middleware for Role-Based Access
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.userRole)) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied: You do not have permission to access this resource",
      });
    }
    next();
  };
};
