const Activity = require("../models/activityModel");
const { closeAllActiveActivities } = require("../utils/activityUtils");

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
  const now = new Date();
  const hours = now.getHours();
  return hours >= 21; // 9 PM = 21:00 in 24-hour format
};

// Start a new activity (or switch activity)
exports.startActivity = async (req, res) => {
  try {
    const { type } = req.body;
    const employeeId = req.employee._id;

    // Check if it's after 9 PM
    if (isAfter9PM()) {
      return res.status(403).json({
        success: false,
        message:
          "Cannot start new activities after 9 PM. Please try again tomorrow.",
      });
    }

    // Find any current active activity and end it
    const currentActivity = await Activity.findOne({
      employeeId,
      isActive: true,
    });

    if (currentActivity) {
      // If current activity is the same type, don't do anything
      if (currentActivity.type === type) {
        return res.status(200).json({
          success: true,
          message: "Already on this activity",
          activity: currentActivity,
          timeLimit: timeLimits[type],
        });
      }

      // Otherwise, end the current activity
      currentActivity.endTime = new Date();
      currentActivity.isActive = false;
      await currentActivity.save();
    }

    // Create new activity
    const newActivity = new Activity({
      employeeId,
      type,
      startTime: new Date(),
    });

    await newActivity.save();

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

    const currentActivity = await Activity.findOne({
      employeeId,
      isActive: true,
    });

    if (!currentActivity) {
      // No active activity, create "On Desk" by default
      const defaultActivity = new Activity({
        employeeId,
        type: "On Desk",
        startTime: new Date(),
      });

      await defaultActivity.save();

      return res.status(200).json({
        success: true,
        message: "Default activity created",
        activity: defaultActivity,
        shouldBlock: false,
        timeLimit: null, // No time limit for "On Desk"
      });
    }

    // Check if the current activity should block the UI
    const shouldBlock = currentActivity.type !== "On Desk";

    // Get time limit for current activity type (if any)
    const timeLimit = timeLimits[currentActivity.type];

    return res.status(200).json({
      success: true,
      message: "Current activity retrieved",
      activity: currentActivity,
      shouldBlock,
      timeLimit,
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

    // Find any current active activity and end it
    const currentActivity = await Activity.findOne({
      employeeId,
      isActive: true,
    });

    if (currentActivity) {
      // If already on desk, don't do anything
      if (currentActivity.type === "On Desk") {
        return res.status(200).json({
          success: true,
          message: "Already on desk",
          activity: currentActivity,
          timeLimit: null, // No time limit for "On Desk"
        });
      }

      // End the current activity
      currentActivity.endTime = new Date();
      currentActivity.isActive = false;
      await currentActivity.save();
    }

    // Create new "On Desk" activity
    const onDeskActivity = new Activity({
      employeeId,
      type: "On Desk",
      startTime: new Date(),
    });

    await onDeskActivity.save();

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
    const startOfDay = new Date(today.setHours(9, 0, 0, 0));
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

    for (const activity of activities) {
      if (activity.type === "On Desk") {
        const start = new Date(activity.startTime);
        const end = activity.isActive ? new Date() : new Date(activity.endTime);

        // Calculate duration in minutes
        const durationInMs = end - start;
        const durationInMinutes = Math.floor(durationInMs / (1000 * 60));

        productiveTimeInMinutes += durationInMinutes;
      }
    }

    // Format productive time as hours and minutes
    const hours = Math.floor(productiveTimeInMinutes / 60);
    const minutes = productiveTimeInMinutes % 60;
    const formattedProductiveTime = `${hours}h ${minutes}m`;

    return res.status(200).json({
      success: true,
      date: today,
      firstOnDeskTime: firstOnDesk ? firstOnDesk.startTime : null,
      todayProductiveTimeInMinutes: productiveTimeInMinutes,
      todayFormattedProductiveTime: formattedProductiveTime,
      todayOnDeskActivitiesCount: activities.filter((a) => a.type === "On Desk")
        .length,
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
