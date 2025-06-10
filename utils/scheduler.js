const cron = require("node-cron");
const {
  unlockExpiredCandidates,
  syncJoiningCandidateLocks,
  syncStatusBasedLocks,
} = require("./candidateLockManager");

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

  // Check candidate locks every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    console.log(
      "Running 5-minute check: Syncing locks for candidates with active joinings"
    );
    try {
      // Update locks for candidates with active joinings (90-day lock)
      const joiningCount = await syncJoiningCandidateLocks();

      // Check candidates with Walkin or Lineup status (but don't lock them directly)
      const lineupWalkinCount = await syncStatusBasedLocks();

      // Also unlock any expired locks
      const unlockedCount = await unlockExpiredCandidates();

      console.log(
        `5-minute check completed: ${joiningCount} joining locks updated, ` +
          `${lineupWalkinCount} candidates with lineup/walkin status checked, ${unlockedCount} expired locks removed`
      );
    } catch (error) {
      console.error(
        "Error in 5-minute scheduled task for candidate locks:",
        error
      );
    }
  });

  console.log("Scheduler initialized successfully");
};

module.exports = {
  initScheduler,
};
