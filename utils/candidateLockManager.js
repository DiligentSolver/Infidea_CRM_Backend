const Candidate = require("../models/candidateModel");
require("dotenv").config();

// Default lock durations if not set in environment variables
const DEFAULT_LINEUP_LOCK_DAYS = 30;
const DEFAULT_JOINING_LOCK_DAYS = 90;

// Get lock durations from environment variables or use defaults
const LINEUP_LOCK_DAYS = parseInt(
  process.env.LINEUP_LOCK_DAYS || DEFAULT_LINEUP_LOCK_DAYS
);
const JOINING_LOCK_DAYS = parseInt(
  process.env.JOINING_LOCK_DAYS || DEFAULT_JOINING_LOCK_DAYS
);

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
 * Lock a candidate for a specified employee
 * @param {string} contactNumber - The candidate's contact number
 * @param {string} employeeId - The ID of the employee who is locking the candidate
 * @param {string} lockType - The type of lock: 'lineup', 'walkin', or 'joining'
 * @returns {Object} - Updated candidate object or null if candidate not found
 */
const lockCandidate = async (contactNumber, employeeId, lockType) => {
  try {
    const candidate = await Candidate.findOne({ mobileNo: contactNumber });

    if (!candidate) {
      return null;
    }

    // Define lock duration based on type
    let lockDurationDays = LINEUP_LOCK_DAYS; // Default for lineup and walkin
    if (lockType === "joining") {
      lockDurationDays = JOINING_LOCK_DAYS; // Days for joining from env
    }

    // Calculate lock expiry date
    const registrationLockExpiry = new Date();
    registrationLockExpiry.setDate(
      registrationLockExpiry.getDate() + lockDurationDays
    );

    // Update registration history
    candidate.registrationHistory.push({
      registeredBy: employeeId,
      registrationDate: new Date(),
      status: "Active",
    });

    // Mark previous history entries as expired
    candidate.registrationHistory.forEach((entry) => {
      if (
        entry.registeredBy.toString() !== employeeId.toString() &&
        entry.status === "Active"
      ) {
        entry.status = "Expired";
      }
    });

    // Update candidate record
    candidate.lastRegisteredBy = employeeId;
    candidate.registrationLockExpiry = registrationLockExpiry;
    candidate.isLocked = true;

    await candidate.save();
    return candidate;
  } catch (error) {
    console.error(`Error locking candidate for ${lockType}:`, error);
    throw error;
  }
};

/**
 * Check if a candidate is currently locked
 * @param {string} contactNumber - The candidate's contact number
 * @returns {Object} - Lock information or null if candidate not found
 */
const checkCandidateLock = async (contactNumber) => {
  try {
    const candidate = await Candidate.findOne({
      mobileNo: contactNumber,
    }).populate("lastRegisteredBy", "name");

    if (!candidate) {
      return null;
    }

    const currentDate = new Date();
    const isLocked =
      candidate.isLocked && candidate.registrationLockExpiry > currentDate;

    // Calculate remaining days if locked
    let remainingDays = 0;
    let remainingTime = null;

    if (isLocked) {
      const diffMs = candidate.registrationLockExpiry - currentDate;
      remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        remainingTime = `${hours}h ${minutes}m`;
      }
    }

    return {
      isLocked,
      lockExpiryDate: candidate.registrationLockExpiry,
      lockedBy: isLocked ? candidate.lastRegisteredBy : null,
      remainingDays,
      remainingTime,
    };
  } catch (error) {
    console.error("Error checking candidate lock:", error);
    throw error;
  }
};

module.exports = {
  unlockExpiredCandidates,
  checkCandidateLock,
  lockCandidate,
  LINEUP_LOCK_DAYS,
  JOINING_LOCK_DAYS,
};
