const Employee = require("../models/employeeModel");

// Send a notification to a user
const sendNotification = async (userId, message, jobId) => {
  try {
    await Employee.findByIdAndUpdate(userId, {
      $push: { notifications: { message, jobId } },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

// Fetch user notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findById(userId).populate(
      "notifications.jobId"
    );

    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    res.json({ success: true, notifications: employee.notifications });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching notifications" });
  }
};

// Mark a notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const employeeId = req.employee.id;

    await Employee.findOneAndUpdate(
      { _id: employeeId, "notifications._id": notificationId },
      { $set: { "notifications.$.read": true } }
    );

    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error marking notification as read" });
  }
};

module.exports = { sendNotification, getNotifications, markAsRead };
