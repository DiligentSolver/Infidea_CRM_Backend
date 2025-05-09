const Candidate = require("../models/candidateModel");

/**
 * Utility function to unlock candidates whose lock periods have expired
 * This should be run periodically, e.g., daily via a cron job
 */
const unlockExpiredCandidates = async () => {
  try {
    const currentDate = new Date();

    // Find and update candidates whose lock has expired
    const result = await Candidate.updateMany(
      {
        isLocked: true,
        registrationLockExpiry: { $lt: currentDate },
      },
      {
        $set: {
          isLocked: false,
          registrationLockExpiry: null,
        },
      }
    );

    console.log(`${result.modifiedCount} candidates unlocked successfully.`);
    return result.modifiedCount;
  } catch (error) {
    console.error("Error unlocking expired candidates:", error);
    throw error;
  }
};

/**
 * Check if a candidate is currently locked
 * @param {string} contactNumber - The candidate's contact number
 * @returns {Object} - { isLocked, lockExpiryDate } or null if candidate not found
 */
const checkCandidateLock = async (contactNumber) => {
  try {
    const candidate = await Candidate.findOne({ mobileNo: contactNumber });

    if (!candidate) {
      return null;
    }

    const currentDate = new Date();
    const isLocked =
      candidate.isLocked && candidate.registrationLockExpiry > currentDate;

    return {
      isLocked,
      lockExpiryDate: candidate.registrationLockExpiry,
    };
  } catch (error) {
    console.error("Error checking candidate lock:", error);
    throw error;
  }
};

module.exports = {
  unlockExpiredCandidates,
  checkCandidateLock,
};
