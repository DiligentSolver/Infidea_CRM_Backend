const cron = require("node-cron");
const Activity = require("../models/activityModel");
const Employee = require("../models/employeeModel");
const { closeAllActiveActivities } = require("./activityUtils");
const { getCurrentDate, addTime, IST_TIMEZONE } = require("./dateUtils");
const moment = require("moment-timezone");
const { io } = global;

/**
 * Reset all activities at midnight and create new "On Desk" activities for next day
 */
const scheduleDailyActivityReset = () => {
  // Run at midnight (00:00) every day in IST
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        console.log("Running scheduled task: Daily activity reset at midnight");

        // Get all employees with active activities
        const employeesWithActiveActivities = await Activity.distinct(
          "employeeId",
          { isActive: true }
        );

        const now = moment().tz(IST_TIMEZONE).toDate();
        let resetCount = 0;

        // Close activities for each employee
        for (const employeeId of employeesWithActiveActivities) {
          try {
            // Close all active activities
            const closedActivities = await closeAllActiveActivities(employeeId);
            resetCount += closedActivities.length;

            // Create system logout activity
            const logoutActivity = new Activity({
              employeeId,
              type: "Logout",
              startTime: now,
              endTime: now,
              isActive: false,
            });
            await logoutActivity.save();
          } catch (error) {
            console.error(
              `Error in daily reset for employee ${employeeId}:`,
              error
            );
            continue;
          }
        }

        console.log(
          `Daily reset completed: Closed ${resetCount} activities for ${employeesWithActiveActivities.length} employees at ${now}`
        );
      } catch (error) {
        console.error("Error in daily activity reset task:", error);
      }
    },
    {
      timezone: IST_TIMEZONE,
    }
  );

  console.log(
    "Scheduled task registered: Daily activity reset at midnight IST"
  );
};

/**
 * Scheduled task to close all active activities at 7:50 PM every day
 */
const scheduleActivityClosing = () => {
  // Run at 7:50 PM (19:50) every day in IST
  cron.schedule(
    "50 19 * * *",
    async () => {
      try {
        console.log(
          "Running scheduled task: Auto-closing activities at 7:50 PM"
        );

        // Get all employees with active activities
        const employeesWithActiveActivities = await Activity.distinct(
          "employeeId",
          { isActive: true }
        );

        let closedCount = 0;
        const now = moment().tz(IST_TIMEZONE).toDate();

        // Close activities for each employee
        for (const employeeId of employeesWithActiveActivities) {
          try {
            const closedActivities = await closeAllActiveActivities(employeeId);
            closedCount += closedActivities.length;

            // Create a "System Logout" activity
            const logoutActivity = new Activity({
              employeeId,
              type: "Logout",
              startTime: now,
              endTime: now,
              isActive: false,
            });
            await logoutActivity.save();
          } catch (error) {
            console.error(
              `Error closing activities for employee ${employeeId}:`,
              error
            );
            continue;
          }
        }

        console.log(
          `Auto-closed ${closedCount} activities for ${employeesWithActiveActivities.length} employees at ${now}`
        );
      } catch (error) {
        console.error("Error in scheduled activity closing task:", error);
      }
    },
    {
      timezone: IST_TIMEZONE,
    }
  );

  // Safety check 2 minutes later at 7:52 PM
  cron.schedule(
    "52 19 * * *",
    async () => {
      try {
        console.log("Running safety check for unclosed activities");

        const activeActivities = await Activity.find({ isActive: true });
        if (activeActivities.length > 0) {
          console.log(
            `Found ${activeActivities.length} unclosed activities in safety check`
          );

          for (const activity of activeActivities) {
            try {
              await closeAllActiveActivities(activity.employeeId);
            } catch (error) {
              console.error(
                `Error in safety check closing for employee ${activity.employeeId}:`,
                error
              );
            }
          }
        }
      } catch (error) {
        console.error("Error in activity closing safety check:", error);
      }
    },
    {
      timezone: IST_TIMEZONE,
    }
  );

  console.log(
    "Scheduled task registered: Auto-closing activities at 7:50 PM IST"
  );
};

// Function to clean up old notifications (older than 30 days)
const cleanupOldNotifications = async () => {
  try {
    console.log("Running scheduled task: Cleaning up old notifications");
    const Notification = require("../models/notificationModel");

    // Calculate date 30 days ago
    const thirtyDaysAgo = addTime(getCurrentDate(), -30, "days");

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

/**
 * Schedule automatic logout of all employees at 7:58 PM IST daily
 */
const scheduleAutoLogout = () => {
  // Schedule for 7:58 PM IST daily (19:58)
  cron.schedule(
    "58 19 * * *",
    async () => {
      try {
        console.log("Running auto logout scheduler...");

        // Find all currently logged in employees
        const loggedInEmployees = await Employee.find({ isLoggedIn: true });

        // Update all logged in employees to logged out
        await Employee.updateMany(
          { isLoggedIn: true },
          {
            $set: {
              isLoggedIn: false,
              lastLogoutTime: new Date(),
            },
          }
        );

        // Emit logout event to each employee
        if (io) {
          loggedInEmployees.forEach((employee) => {
            io.to(`employee-${employee._id}`).emit("force_logout", {
              message: "Auto logout at end of day (7:58 PM)",
            });
          });
        }

        console.log(`Auto logged out ${loggedInEmployees.length} employees`);
      } catch (error) {
        console.error("Error in auto logout scheduler:", error);
      }
    },
    {
      timezone: IST_TIMEZONE,
    }
  );

  console.log("Scheduled task registered: Auto logout at 7:58 PM IST");
};

/**
 * Scheduler to check and expire tokens at 9 PM IST daily
 */
const scheduleTokenExpiryCheck = () => {
  // Run at 9 PM (21:00) every day in IST
  cron.schedule(
    "0 21 * * *",
    async () => {
      try {
        // Here you would implement logic to blacklist tokens or update DB/session store
        // For stateless JWT, this is a placeholder
        console.log(
          "[Token Expiry Scheduler] 9 PM IST: All tokens should now be considered expired."
        );
      } catch (error) {
        console.error("Error in token expiry scheduler:", error);
      }
    },
    {
      timezone: IST_TIMEZONE,
    }
  );

  console.log("Scheduled task registered: Token expiry check at 9 PM IST");
};

module.exports = {
  scheduleActivityClosing,
  scheduleNotificationCleanup,
  scheduleDailyActivityReset,
  scheduleAutoLogout,
  scheduleTokenExpiryCheck,
};
