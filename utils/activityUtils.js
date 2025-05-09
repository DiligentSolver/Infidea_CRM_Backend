const Activity = require("../models/activityModel");

/**
 * Closes all active activities for a specific employee
 * @param {ObjectId} employeeId - The ID of the employee
 * @returns {Promise<Array>} - Array of closed activities
 */
exports.closeAllActiveActivities = async (employeeId) => {
  try {
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
    const closingTime = new Date();
    const closedActivities = [];

    for (const activity of activeActivities) {
      activity.endTime = closingTime;
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
