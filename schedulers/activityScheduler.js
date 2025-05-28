const cron = require("node-cron");
const {
  IST_TIMEZONE,
  getCurrentISTHour,
  getCurrentISTMinute,
} = require("../utils/dateUtils");
const Activity = require("../models/Activity"); // Assuming you have an Activity model

// Schedule task to run at 7:50 PM IST every day
// Format: minute hour * * * (50 19 * * *)
const scheduleActivityEnd = () => {
  console.log(
    "Activity end scheduler initialized. Will run daily at 7:50 PM IST"
  );

  cron.schedule(
    "50 19 * * *",
    async () => {
      try {
        console.log("Running activity end scheduler...");

        // Update all active activities to ended status
        const result = await Activity.updateMany(
          { status: "active" }, // Find all active activities
          {
            $set: {
              status: "ended",
              endedAt: new Date(),
            },
          }
        );

        console.log(`Successfully ended ${result.modifiedCount} activities`);
      } catch (error) {
        console.error("Error in activity end scheduler:", error);
      }
    },
    {
      timezone: IST_TIMEZONE, // Use IST timezone from dateUtils
    }
  );
};

module.exports = {
  scheduleActivityEnd,
};
