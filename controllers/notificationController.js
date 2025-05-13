const Notification = require("../models/notificationModel");
const { handleAsync } = require("../utils/attemptAndOtp");
const { emitNotification } = require("../utils/socketManager");

/**
 * Create a notification and send it via socket.io
 * @param {Object} notificationData - The notification data
 * @param {string} notificationData.recipient - The recipient employee ID
 * @param {string} notificationData.message - The notification message
 * @param {string} notificationData.type - The notification type
 * @param {Object} notificationData.metadata - Additional metadata
 * @param {Object} io - The socket.io instance (optional, will use global.io if not provided)
 */
const createNotification = async (notificationData, io) => {
  try {
    const notification = await Notification.create(notificationData);
    const populatedNotification = await notification.populate(
      "recipient",
      "name"
    );

    // Use provided io instance or fall back to global.io
    const socketIo = io || global.io;

    // Emit the notification to the recipient's personal room if socket.io is available
    if (socketIo) {
      socketIo
        .to(`employee-${notification.recipient}`)
        .emit("new_notification", {
          notification: populatedNotification,
        });
    }

    // Also use the socketManager utility for more consistent behavior
    emitNotification(notification.recipient, populatedNotification);

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Create a notification for candidate duplicity check
 * This is triggered when someone checks if a candidate already exists
 */
const createDuplicityCheckNotification = async (
  candidateData,
  checkingEmployeeData,
  recipientEmployeeId,
  io
) => {
  try {
    const notificationData = {
      recipient: recipientEmployeeId,
      message: `Someone is checking candidate ${candidateData.name} (${candidateData.mobileNo}) which you previously registered.`,
      type: "candidate_duplicity_check",
      metadata: {
        candidateId: candidateData._id,
        candidateName: candidateData.name,
        candidateContactNumber: candidateData.mobileNo,
        employeeId: checkingEmployeeData._id,
        employeeName: checkingEmployeeData.name.en,
      },
    };

    return await createNotification(notificationData, io);
  } catch (error) {
    console.error("Error creating duplicity check notification:", error);
    throw error;
  }
};

/**
 * Create a notification for candidate marking
 * This is triggered when someone marks a candidate previously registered by another employee
 */
const createCandidateMarkNotification = async (
  candidateData,
  markingEmployeeData,
  recipientEmployeeId,
  io
) => {
  try {
    const notificationData = {
      recipient: recipientEmployeeId,
      message: `${markingEmployeeData.name.en} has marked candidate ${candidateData.name} (${candidateData.mobileNo}) which you previously registered.`,
      type: "candidate_marked",
      metadata: {
        candidateId: candidateData._id,
        candidateName: candidateData.name,
        candidateContactNumber: candidateData.mobileNo,
        employeeId: markingEmployeeData._id,
        employeeName: markingEmployeeData.name.en,
      },
    };

    return await createNotification(notificationData, io);
  } catch (error) {
    console.error("Error creating candidate mark notification:", error);
    throw error;
  }
};

// Get all notifications for the current employee
const getMyNotifications = handleAsync(async (req, res) => {
  const notifications = await Notification.find({
    recipient: req.employee._id,
  })
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({
    status: "success",
    results: notifications.length,
    notifications,
  });
});

// Get unread notification count for the current employee
const getUnreadCount = handleAsync(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.employee._id,
    status: "unread",
  });

  res.status(200).json({
    status: "success",
    count,
  });
});

// Mark notification as read
const markAsRead = handleAsync(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: req.employee._id, // Ensure the notification belongs to this employee
    },
    { status: "read" },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      status: "fail",
      message: "Notification not found or not authorized",
    });
  }

  // Emit notification update via socket
  if (global.io) {
    global.io.to(`employee-${req.employee._id}`).emit("notification_read", {
      notificationId,
    });
  }

  res.status(200).json({
    status: "success",
    notification,
  });
});

// Mark all notifications as read
const markAllAsRead = handleAsync(async (req, res) => {
  await Notification.updateMany(
    {
      recipient: req.employee._id,
      status: "unread",
    },
    { status: "read" }
  );

  // Emit all notifications read via socket
  if (global.io) {
    global.io.to(`employee-${req.employee._id}`).emit("all_notifications_read");
  }

  res.status(200).json({
    status: "success",
    message: "All notifications marked as read",
  });
});

// Delete a notification
const deleteNotification = handleAsync(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: req.employee._id, // Ensure the notification belongs to this employee
  });

  if (!notification) {
    return res.status(404).json({
      status: "fail",
      message: "Notification not found or not authorized",
    });
  }

  // Emit notification deleted via socket
  if (global.io) {
    global.io.to(`employee-${req.employee._id}`).emit("notification_deleted", {
      notificationId,
    });
  }

  res.status(200).json({
    status: "success",
    message: "Notification deleted successfully",
  });
});

module.exports = {
  createNotification,
  createDuplicityCheckNotification,
  createCandidateMarkNotification,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
