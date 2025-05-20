const Activity = require("../models/activityModel");
const dateUtils = require("../utils/dateUtils");

/**
 * Closes all active activities for a specific employee
 * @param {ObjectId} employeeId - The ID of the employee
 * @returns {Promise<Array>} - Array of closed activities
 */
exports.closeAllActiveActivities = async (employeeId) => {
  try {
    const now = dateUtils.getCurrentDate();
    // Find all active activities for the employee
    const activeActivities = await Activity.find({
      employeeId,
      isActive: true,
    });

    // If no active activities, return empty array
    if (!activeActivities || activeActivities.length === 0) {
      return [];
    }

    // Mark each activity as closed
    const closedActivities = [];

    for (const activity of activeActivities) {
      activity.endTime = now;
      activity.isActive = false;
      await activity.save();
      closedActivities.push(activity);
    }

    return closedActivities;
  } catch (error) {
    console.error("Error closing activities:", error);
    throw error;
  }
};

const closeActivity = async (activityId) => {
  try {
    // ... existing code ...

    // Update the endTime to current time
    const closingTime = dateUtils.getCurrentDate();

    // ... existing code ...
  } catch (error) {
    // ... existing code ...
  }
};
