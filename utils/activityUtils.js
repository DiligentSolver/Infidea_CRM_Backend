const Activity = require("../models/activityModel");
const dateUtils = require("./dateUtils");
const moment = require("moment-timezone");
const { IST_TIMEZONE } = require("./dateUtils");

/**
 * Closes all active activities for a specific employee
 * @param {ObjectId} employeeId - The ID of the employee
 * @param {Object} options - Optional parameters
 * @param {boolean} options.excludeOnDesk - Whether to exclude "On Desk" activities from closing
 * @returns {Promise<Array>} - Array of closed activities
 */
exports.closeAllActiveActivities = async (employeeId, options = {}) => {
  try {
    const now = moment().tz(IST_TIMEZONE).toDate();

    // Build query for active activities
    const query = {
      employeeId,
      isActive: true,
    };

    // If excludeOnDesk is true, don't close "On Desk" activities
    if (options.excludeOnDesk) {
      query.type = { $ne: "On Desk" };
    }

    // Find all matching active activities for the employee
    const activeActivities = await Activity.find(query);

    // If no active activities, return empty array
    if (!activeActivities || activeActivities.length === 0) {
      return [];
    }

    // Mark each activity as closed
    const closedActivities = [];
    const bulkOps = [];

    for (const activity of activeActivities) {
      activity.endTime = now;
      activity.isActive = false;
      bulkOps.push({
        updateOne: {
          filter: { _id: activity._id },
          update: { $set: { endTime: now, isActive: false } },
        },
      });
      closedActivities.push(activity);
    }

    // Use bulkWrite for better performance
    if (bulkOps.length > 0) {
      await Activity.bulkWrite(bulkOps);
    }

    return closedActivities;
  } catch (error) {
    console.error("Error closing activities:", error);
    throw error;
  }
};

/**
 * Close a specific activity
 * @param {string} activityId - The ID of the activity to close
 * @returns {Promise<Object>} - The closed activity
 */
exports.closeActivity = async (activityId) => {
  try {
    const now = moment().tz(IST_TIMEZONE).toDate();

    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error("Activity not found");
    }

    if (!activity.isActive) {
      return activity; // Already closed
    }

    activity.endTime = now;
    activity.isActive = false;
    await activity.save();

    return activity;
  } catch (error) {
    console.error("Error closing activity:", error);
    throw error;
  }
};
