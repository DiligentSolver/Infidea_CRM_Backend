const cron = require("node-cron");
const Activity = require("../models/activityModel");
const Employee = require("../models/employeeModel");
const { closeAllActiveActivities } = require("./activityUtils");

/**
 * Scheduled task to close all active activities at 9 PM every day
 */
const scheduleActivityClosing = () => {
  // Run at 9 PM (21:00) every day
  cron.schedule("0 21 * * *", async () => {
    try {
      console.log("Running scheduled task: Auto-closing activities at 9 PM");

      // Get all employees with active activities
      const employeesWithActiveActivities = await Activity.distinct(
        "employeeId",
        { isActive: true }
      );

      let closedCount = 0;

      // Close activities for each employee
      for (const employeeId of employeesWithActiveActivities) {
        const closedActivities = await closeAllActiveActivities(employeeId);
        closedCount += closedActivities.length;
      }

      console.log(
        `Auto-closed ${closedCount} activities for ${employeesWithActiveActivities.length} employees`
      );
    } catch (error) {
      console.error("Error in scheduled activity closing task:", error);
    }
  });

  console.log("Scheduled task registered: Auto-closing activities at 9 PM");
};

// Function to clean up old notifications (older than 30 days)
const cleanupOldNotifications = async () => {
  try {
    console.log("Running scheduled task: Cleaning up old notifications");
    const Notification = require("../models/notificationModel");

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Delete notifications older than 30 days
    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
    });

    console.log(`Deleted ${result.deletedCount} old notifications`);
  } catch (error) {
    console.error("Error cleaning up old notifications:", error);
  }
};

// Schedule notification cleanup - run once a day at 3 AM
const scheduleNotificationCleanup = () => {
  // Run at 3:00 AM every day
  cron.schedule("0 3 * * *", cleanupOldNotifications);

  console.log("Scheduled notification cleanup: Every day at 3:00 AM");
};

module.exports = {
  scheduleActivityClosing,
  scheduleNotificationCleanup,
};
