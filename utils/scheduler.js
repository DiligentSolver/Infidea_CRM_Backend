const cron = require("node-cron");
const { unlockExpiredCandidates } = require("./candidateLockManager");

/**
 * Initialize all scheduler tasks
 */
const initScheduler = () => {
  // Unlock expired candidates every day at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("Running scheduled task: Unlocking expired candidate locks");
    try {
      const count = await unlockExpiredCandidates();
      console.log(
        `Scheduled task completed: ${count} candidate locks expired and removed`
      );
    } catch (error) {
      console.error("Error in scheduled task for unlocking candidates:", error);
    }
  });

  console.log("Scheduler initialized successfully");
};

module.exports = {
  initScheduler,
};
