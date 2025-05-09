const Leave = require("../models/leaveModel");

// Helper function to check if a date is a weekoff
const isWeekoff = (date) => {
  const dayOfWeek = date.getDay();

  // Sunday is always a weekoff
  if (dayOfWeek === 0) return true;

  // Check if it's a 2nd or 4th Saturday
  if (dayOfWeek === 6) {
    const weekOfMonth = Math.ceil(date.getDate() / 7);
    if (weekOfMonth === 2 || weekOfMonth === 4) return true;
  }

  return false;
};

// Apply for leave
exports.applyLeave = async (req, res) => {
  try {
    const { leaveType, leaveReason, startDate, endDate, description } =
      req.body;
    const employeeId = req.employee._id; // Assuming user ID is available in the request after authentication

    // Convert string dates to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Find weekoff days between start and end dates
    const weekoffDates = [];
    const currentDate = new Date(start);

    // Loop through each day to find weekoffs
    while (currentDate <= end) {
      if (isWeekoff(currentDate)) {
        weekoffDates.push(new Date(currentDate));
      }
      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    let leave;

    if (weekoffDates.length > 0) {
      // Create the leave record
      leave = new Leave({
        employee: employeeId,
        leaveType,
        leaveReason: "Sandwich Leave",
        startDate,
        endDate,
        description,
        status: "Pending",
        // Mark as sandwich leave if there are weekoff days
        isSandwich: weekoffDates.length > 0,
      });
      await leave.save();
    } else {
      leave = new Leave({
        employee: employeeId,
        leaveType,
        leaveReason,
        startDate,
        endDate,
        description,
        status: "Pending",
      });
      await leave.save();
    }
    res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      data: {
        leave: leave,
        weekoffDates: weekoffDates.length > 0 ? weekoffDates : undefined,
        isSandwich: weekoffDates.length > 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to apply for leave",
      error: error.message,
    });
  }
};

const cancelLeave = async (req, res) => {
  const employeeId = req.employee._id;
  if (employeeId) {
    try {
      const leave = await Leave.findOne({
        employee: employeeId,
        status: "Pending",
      });
      if (leave) {
        leave.status = "Cancelled";
        await leave.save();
      }

      return res.status(200).json({
        success: true,
        message: "Leave cancelled successfully",
      });
    } catch (error) {
      console.error("Error cancelling leave:", error);
      throw error;
    }
  } else {
    return res.status(400).json({
      success: false,
      message: "Employee ID is required",
    });
  }
};

// Get leaves for an employee
exports.getEmployeeLeaves = async (req, res) => {
  try {
    const employeeId = req.employee._id; // Get employee ID from authenticated user

    const leaves = await Leave.find({ employee: employeeId })
      .sort({ createdAt: -1 })
      .populate("approver", "name employeeCode");

    res.status(200).json({
      success: true,
      message: "Leaves fetched successfully",
      data: leaves,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch leaves",
      error: error.message,
    });
  }
};

// Get all leaves (for admin)
exports.getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find()
      .sort({ createdAt: -1 })
      .populate("employee", "name employeeCode email")
      .populate("approver", "name employeeCode");

    res.status(200).json({
      success: true,
      message: "All leaves fetched successfully",
      data: leaves,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch leaves",
      error: error.message,
    });
  }
};

// Approve or reject leave
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, approvalComment } = req.body;
    const approverId = req.user._id; // Admin/approver ID

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Status must be 'Approved' or 'Rejected'",
      });
    }

    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    leave.status = status;
    leave.approver = approverId;
    leave.approvalDate = new Date();
    leave.approvalComment = approvalComment || "";

    await leave.save();

    res.status(200).json({
      success: true,
      message: `Leave ${status.toLowerCase()} successfully`,
      data: leave,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update leave status",
      error: error.message,
    });
  }
};

// Get leave details
exports.getLeaveById = async (req, res) => {
  try {
    const { leaveId } = req.params;

    const leave = await Leave.findById(leaveId)
      .populate("employee", "name employeeCode email")
      .populate("approver", "name employeeCode");

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Leave details fetched successfully",
      data: leave,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch leave details",
      error: error.message,
    });
  }
};

exports.cancelLeave = cancelLeave;
