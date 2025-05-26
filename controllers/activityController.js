const Activity = require("../models/activityModel");
const { closeAllActiveActivities } = require("../utils/activityUtils");
const moment = require("moment-timezone");
const { IST_TIMEZONE } = require("../utils/dateUtils");

// Define time limits for activities
const timeLimits = {
  "Lunch Break": 30, // 30 minutes
  "Interview Session": 15, // 15 minutes
  "Client Meeting": 30, // 30 minutes
  "Team Meeting": 30, // 30 minutes
  // Default activities don't have time limits
  "On Desk": null,
};

// Helper function to check if current time is after 9 PM
const isAfter9PM = () => {
  const now = moment().tz(IST_TIMEZONE);
  const hours = now.hours();
  return hours >= 21; // 9 PM = 21:00 in 24-hour format
};

// Helper function to validate no other active activities exist
const validateNoActiveActivities = async (employeeId) => {
  const activeActivities = await Activity.find({ employeeId, isActive: true });
  if (activeActivities.length > 0) {
    // Close any existing active activities
    await closeAllActiveActivities(employeeId);
  }
};

// Start a new activity (or switch activity)
exports.startActivity = async (req, res) => {
  try {
    const { type } = req.body;
    const employeeId = req.employee._id;

    // Validate activity type
    if (!Object.keys(timeLimits).includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity type",
      });
    }

    // Check if it's after 9 PM
    if (isAfter9PM()) {
      await closeAllActiveActivities(employeeId);
      return res.status(403).json({
        success: false,
        message:
          "Cannot start new activities after 9 PM. Please try again tomorrow.",
      });
    }

    // Ensure no other active activities exist
    await validateNoActiveActivities(employeeId);

    const now = moment().tz(IST_TIMEZONE).toDate();

    // Create new activity
    const newActivity = new Activity({
      employeeId,
      type,
      startTime: now,
    });

    try {
      await newActivity.save();
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        // Another activity was started concurrently, close it and retry
        await closeAllActiveActivities(employeeId);
        await newActivity.save();
      } else {
        throw error;
      }
    }

    return res.status(201).json({
      success: true,
      message: `${type} activity started`,
      activity: newActivity,
      timeLimit: timeLimits[type],
    });
  } catch (error) {
    console.error("Start activity error:", error);
    return res.status(500).json({
      success: false,
      message: "Error starting activity",
      error: error.message,
    });
  }
};

// Get current activity for the employee
exports.getCurrentActivity = async (req, res) => {
  try {
    const employeeId = req.employee._id;

    // Check if it's after 9 PM
    if (isAfter9PM()) {
      // Close any active activities
      await closeAllActiveActivities(employeeId);

      return res.status(200).json({
        success: true,
        message: "All activities automatically closed after 9 PM",
        activity: null,
        shouldBlock: false,
        timeLimit: null,
        isAfterHours: true,
      });
    }

    // Ensure only one active activity exists
    const activeActivities = await Activity.find({
      employeeId,
      isActive: true,
    });

    if (activeActivities.length > 1) {
      // If multiple active activities found, close all and create new "On Desk"
      await closeAllActiveActivities(employeeId);
      const now = moment().tz(IST_TIMEZONE).toDate();

      const defaultActivity = new Activity({
        employeeId,
        type: "On Desk",
        startTime: now,
      });

      await defaultActivity.save();

      return res.status(200).json({
        success: true,
        message:
          "Multiple activities found and resolved. Created default activity.",
        activity: defaultActivity,
        shouldBlock: false,
        timeLimit: null,
      });
    }

    const currentActivity = activeActivities[0];

    if (currentActivity) {
      // Check if the activity is stale (more than 24 hours old)
      const activityStartTime = moment(currentActivity.startTime);
      const now = moment().tz(IST_TIMEZONE);
      const hoursDifference = now.diff(activityStartTime, "hours");

      if (hoursDifference >= 24) {
        // Close the stale activity
        await closeAllActiveActivities(employeeId);

        // Create a system logout activity for the stale activity
        const logoutActivity = new Activity({
          employeeId,
          type: "Logout",
          startTime: now.toDate(),
          endTime: now.toDate(),
          isActive: false,
        });
        await logoutActivity.save();

        // Create new "On Desk" activity
        const defaultActivity = new Activity({
          employeeId,
          type: "On Desk",
          startTime: now.toDate(),
        });

        await defaultActivity.save();

        return res.status(200).json({
          success: true,
          message:
            "Stale activity detected and reset. Created new default activity.",
          activity: defaultActivity,
          shouldBlock: false,
          timeLimit: null,
        });
      }

      // Activity is not stale, return it
      const shouldBlock = currentActivity.type !== "On Desk";
      const timeLimit = timeLimits[currentActivity.type];

      return res.status(200).json({
        success: true,
        message: "Current activity retrieved",
        activity: currentActivity,
        shouldBlock,
        timeLimit,
      });
    }

    // No active activity, create "On Desk" by default
    const now = moment().tz(IST_TIMEZONE).toDate();

    const defaultActivity = new Activity({
      employeeId,
      type: "On Desk",
      startTime: now,
    });

    await defaultActivity.save();

    return res.status(200).json({
      success: true,
      message: "Default activity created",
      activity: defaultActivity,
      shouldBlock: false,
      timeLimit: null, // No time limit for "On Desk"
    });
  } catch (error) {
    console.error("Get current activity error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving current activity",
      error: error.message,
    });
  }
};

// End an activity (set to "On Desk")
exports.goOnDesk = async (req, res) => {
  try {
    const employeeId = req.employee._id;
    const now = moment().tz(IST_TIMEZONE).toDate();

    // Ensure no other active activities exist
    await validateNoActiveActivities(employeeId);

    // Create new "On Desk" activity
    const onDeskActivity = new Activity({
      employeeId,
      type: "On Desk",
      startTime: now,
    });

    try {
      await onDeskActivity.save();
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        // Another activity was started concurrently, close it and retry
        await closeAllActiveActivities(employeeId);
        await onDeskActivity.save();
      } else {
        throw error;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Now on desk",
      activity: onDeskActivity,
      timeLimit: null, // No time limit for "On Desk"
    });
  } catch (error) {
    console.error("Go on desk error:", error);
    return res.status(500).json({
      success: false,
      message: "Error setting status to on desk",
      error: error.message,
    });
  }
};

// Get activity history for reporting
exports.getActivityHistory = async (req, res) => {
  try {
    const employeeId = req.employee._id;

    const activities = await Activity.find({ employeeId }).sort({
      startTime: -1,
    });

    return res.status(200).json({
      success: true,
      count: activities.length,
      activities,
    });
  } catch (error) {
    console.error("Get activity history error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving activity history",
      error: error.message,
    });
  }
};

// Get activity time limits
exports.getActivityTimeLimits = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      timeLimits,
    });
  } catch (error) {
    console.error("Get activity time limits error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving activity time limits",
      error: error.message,
    });
  }
};

// Get first on-desk time and productive time for the day
exports.getDailyProductivity = async (req, res) => {
  try {
    const employeeId = req.employee._id;

    // Get the start and end of today
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)); // Start from beginning of the day
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Find all activities for today
    const activities = await Activity.find({
      employeeId,
      startTime: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ startTime: 1 });

    // Find first "On Desk" activity
    const firstOnDesk = activities.find(
      (activity) => activity.type === "On Desk"
    );

    // Calculate productive time (total time spent "On Desk")
    let productiveTimeInMinutes = 0;

    const onDeskActivities = activities.filter(
      (activity) => activity.type === "On Desk"
    );

    for (const activity of onDeskActivities) {
      const start = new Date(activity.startTime);
      const end = activity.isActive ? new Date() : new Date(activity.endTime);

      // Calculate duration in minutes
      const durationInMs = end - start;
      const durationInMinutes = Math.floor(durationInMs / (1000 * 60));

      productiveTimeInMinutes += durationInMinutes;
    }

    // Format productive time as hours and minutes
    const hours = Math.floor(productiveTimeInMinutes / 60);
    const minutes = productiveTimeInMinutes % 60;
    const formattedProductiveTime = `${hours}h ${minutes}m`;

    return res.status(200).json({
      success: true,
      date: new Date(),
      firstOnDeskTime: firstOnDesk ? firstOnDesk.startTime : null,
      todayProductiveTimeInMinutes: productiveTimeInMinutes,
      todayFormattedProductiveTime: formattedProductiveTime,
      todayOnDeskActivitiesCount: onDeskActivities.length,
    });
  } catch (error) {
    console.error("Get daily productivity error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving daily productivity data",
      error: error.message,
    });
  }
};
