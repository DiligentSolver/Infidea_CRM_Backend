const cron = require("node-cron");
const Activity = require("../models/activityModel");
const Employee = require("../models/employeeModel");
const { closeAllActiveActivities } = require("./activityUtils");

/**
 * Scheduled task to close all active activities at 9 PM every day
 */
exports.scheduleActivityClosing = () => {
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
