require("dotenv").config();
const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/db");
const employeeAuthRoutes = require("./routes/employeeAuthRoutes");
const employeeDashboardRoutes = require("./routes/employeeDashboardRoutes");
const lineupRoutes = require("./routes/lineupRoutes");
const joiningRoutes = require("./routes/joiningRoutes");
const walkinRoutes = require("./routes/walkinRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const activityRoutes = require("./routes/activityRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const errorHandler = require("./middleware/errorHandler");
const { getRedisClient, connectRedis } = require("./utils/redisClient");
const notificationRoutes = require("./routes/notificationRoutes");
const limiter = require("./middleware/ratelimiterRedis");
const emailRoutes = require("./routes/emailRoutes"); // Import email routes
const thoughtRoutes = require("./routes/thoughtRoutes"); // Import thought routes
const noteRoutes = require("./routes/noteRoutes"); // Import note routes
const frontendApis = require("./frontendApis"); // Import frontend APIs
const fileUpload = require("express-fileupload");
const path = require("path");
const {
  scheduleActivityClosing,
  scheduleNotificationCleanup,
  scheduleDailyActivityReset,
  scheduleAutoLogout,
  scheduleTokenExpiryCheck,
} = require("./utils/scheduledTasks");
const { initScheduler } = require("./utils/scheduler");
const { scheduleDailyReport } = require("./utils/dailyReportGenerator");
const moment = require("moment-timezone");
const { IST_TIMEZONE } = require("./utils/dateUtils");
const clientDetailsRoutes = require("./routes/clientDetails");
const databaseExportRoutes = require("./routes/databaseExportRoutes");

dotenv.config();
connectDB();

// Connect to Redis after environment variables are loaded
connectRedis();

// Configure Express to trust proxies for accurate IP detection
// This allows req.ip to return the correct client IP when behind a proxy
app.set("trust proxy", true);

// Initialize scheduled tasks
scheduleActivityClosing();
scheduleNotificationCleanup();
scheduleDailyActivityReset(); // Add daily reset scheduler
scheduleAutoLogout(); // Initialize auto logout scheduler
initScheduler(); // Initialize candidate lock scheduler
scheduleDailyReport(); // Initialize daily report scheduler at 8 PM

// Set default timezone to Indian Standard Time globally
moment.tz.setDefault(IST_TIMEZONE);

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (modify for production)
    methods: ["GET", "POST"],
  },
});

// Make io globally available
global.io = io;

// Middleware to make `io` accessible in controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors());
app.use(helmet());
app.use(express.json());
app.options("*", cors());
app.use(errorHandler);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Apply rate limiter to all API routes
// app.use("/api", limiter);

// Routes
app.use("/crm/api/auth/employee", employeeAuthRoutes);
app.use("/crm/api/employee", employeeDashboardRoutes);
app.use("/crm/api", frontendApis); //Frontend apis
app.use("/crm/api/lineups", lineupRoutes);
app.use("/crm/api/joinings", joiningRoutes);
app.use("/crm/api/walkins", walkinRoutes);
app.use("/crm/api/candidates", candidateRoutes);
app.use("/crm/api/activity", activityRoutes);
app.use("/crm/api/leaves", leaveRoutes);
app.use("/crm/api/notifications", notificationRoutes);
app.use("/crm/api/email", emailRoutes); // Add email routes
app.use("/crm/api/thoughts", thoughtRoutes); // Add thought routes
app.use("/crm/api/clients", clientDetailsRoutes); // Add client details routes
app.use("/crm/api/notes", noteRoutes); // Add note routes
app.use("/crm/api/export", databaseExportRoutes); // Add database export routes

// Configure file upload middleware
app.use(
  fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
    useTempFiles: false,
    abortOnLimit: true,
  })
);

const PORT = process.env.PORT || 5300;
// Change from app.listen to server.listen for Socket.io
server.listen(PORT, () =>
  console.info(`CRM_SERVER running on port ${PORT} with WebSockets enabled`)
);

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("A client connected", socket.id);

  // Join employee to their personal room
  socket.on("join-employee-room", (employeeId) => {
    if (employeeId) {
      socket.join(`employee-${employeeId}`);
      console.log(`Employee ${employeeId} joined their room`);
    }
  });

  // Handle read notification event
  socket.on("read_notification", async (data) => {
    try {
      const { notificationId, employeeId } = data;
      if (!notificationId || !employeeId) return;

      const Notification = require("./models/notificationModel");
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: employeeId },
        { status: "read" }
      );
    } catch (error) {
      console.error("Error marking notification as read via socket:", error);
    }
  });

  // Handle read all notifications event
  socket.on("read_all_notifications", async (data) => {
    try {
      const { employeeId } = data;
      if (!employeeId) return;

      const Notification = require("./models/notificationModel");
      await Notification.updateMany(
        { recipient: employeeId, status: "unread" },
        { status: "read" }
      );
    } catch (error) {
      console.error(
        "Error marking all notifications as read via socket:",
        error
      );
    }
  });

  // Handle client disconnection
  socket.on("disconnect", () => {
    console.log("A client disconnected", socket.id);
  });
});

app.get("/crm/api/health-check", (req, res) => {
  res.send("Hello, World!");
  console.info("Hello, World");
});

async function closeRedis() {
  try {
    const client = getRedisClient();
    if (client && client.isOpen) {
      console.log("Closing Redis connection...");
      await client.quit();
    } else {
      console.log("Redis client is already closed.");
    }
  } catch (err) {
    console.error("Error closing Redis connection:", err);
  }
  process.exit(0);
}

process.on("SIGINT", closeRedis); // Handles Ctrl + C
process.on("SIGTERM", closeRedis); // Handles process termination
