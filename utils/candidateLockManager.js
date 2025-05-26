const Candidate = require("../models/candidateModel");
const Joining = require("../models/joiningModel");
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
 * This should be run periodically, e.g., every 5 minutes via cron job
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
          callStatus: "Not Aligned Anywhere",
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
 * Check if a candidate has an active joining and should be locked
 * @param {string} contactNumber - The candidate's contact number
 * @returns {boolean} - Whether the candidate has an active joining record
 */
const hasActiveJoining = async (contactNumber) => {
  try {
    const joining = await Joining.findOne({
      contactNumber,
    });

    return !!joining;
  } catch (error) {
    console.error("Error checking for active joining:", error);
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
      lockDurationDays = JOINING_LOCK_DAYS;
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

    // Check if the candidate has an active joining record
    const joiningActive = await hasActiveJoining(contactNumber);

    const currentDate = new Date();
    let isLocked =
      candidate.isLocked && candidate.registrationLockExpiry > currentDate;

    // If joining is active, the candidate is locked regardless of other conditions
    if (joiningActive) {
      isLocked = true;
    }

    // Calculate remaining days if locked
    let remainingDays = 0;
    let remainingTime = null;
    let lockExpiryDate = candidate.registrationLockExpiry;

    if (isLocked) {
      if (
        joiningActive &&
        (!candidate.isLocked || !candidate.registrationLockExpiry)
      ) {
        // If joining active but no lock expiry set, create one for 90 days
        lockExpiryDate = new Date();
        lockExpiryDate.setDate(lockExpiryDate.getDate() + JOINING_LOCK_DAYS);
      }

      const diffMs = lockExpiryDate - currentDate;
      remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        remainingTime = `${hours}h ${minutes}m`;
      }
    }

    return {
      isLocked,
      lockExpiryDate,
      lockedBy: isLocked ? candidate.lastRegisteredBy : null,
      remainingDays,
      remainingTime,
      joiningActive,
    };
  } catch (error) {
    console.error("Error checking candidate lock:", error);
    throw error;
  }
};

/**
 * Sync the lock status of all candidates with joining records
 * This checks all joining records and ensures candidates are properly locked
 * @returns {number} - Number of candidates updated
 */
const syncJoiningCandidateLocks = async () => {
  try {
    const joinings = await Joining.find({
      status: "Joining Details Received",
    });

    let updatedCount = 0;

    for (const joining of joinings) {
      const candidate = await Candidate.findOne({
        mobileNo: joining.contactNumber,
      });

      if (candidate) {
        // If candidate doesn't have a lock or lock has expired, create a new one
        const currentDate = new Date();
        if (
          !candidate.isLocked ||
          candidate.registrationLockExpiry < currentDate
        ) {
          const registrationLockExpiry = new Date();
          registrationLockExpiry.setDate(
            registrationLockExpiry.getDate() + JOINING_LOCK_DAYS
          );

          candidate.isLocked = true;
          candidate.registrationLockExpiry = registrationLockExpiry;

          // If no lastRegisteredBy set, use the joining creator
          if (!candidate.lastRegisteredBy) {
            candidate.lastRegisteredBy = joining.createdBy;
          }

          await candidate.save();
          updatedCount++;
        }
      }
    }

    console.log(
      `${updatedCount} candidates with joinings had their locks updated.`
    );
    return updatedCount;
  } catch (error) {
    console.error("Error syncing joining candidate locks:", error);
    throw error;
  }
};

/**
 * Check candidates with walkin or lineup status for active joinings
 * This function now just logs the count of candidates with walkin/lineup status
 * but does not directly lock them as per the new dependency hierarchy
 */
const syncStatusBasedLocks = async () => {
  try {
    // Find all candidates with Walkin or Lineup status
    const candidates = await Candidate.find({
      callStatus: { $in: ["Walkin", "Lineup"] },
    });

    console.log(
      `${candidates.length} candidates found with Walkin/Lineup status. No direct locking applied as per new policy.`
    );

    // Now we're only returning a count, not updating anything
    return 0;
  } catch (error) {
    console.error("Error checking status-based candidate locks:", error);
    throw error;
  }
};

module.exports = {
  unlockExpiredCandidates,
  checkCandidateLock,
  lockCandidate,
  syncJoiningCandidateLocks,
  syncStatusBasedLocks,
  hasActiveJoining,
  LINEUP_LOCK_DAYS,
  JOINING_LOCK_DAYS,
};
