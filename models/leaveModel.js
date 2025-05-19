const mongoose = require("mongoose");

const LeaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leaveType: {
      type: String,
      required: true,
      enum: ["Full Day", "Half Day", "Early Logout"],
    },
    leaveReason: {
      type: String,
      required: true,
      enum: [
        "Sick Leave",
        "Privilege Leave",
        "Casual Leave",
        "Sandwich Leave",
        "Early Logout",
      ],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },
    approvedBy: {
      type: String,
      default: "No Approval",
    },
    approvalDate: {
      type: Date,
    },
    isSandwich: {
      type: Boolean,
      default: false,
    },
    relatedLeaveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Leave",
    },
  },
  { timestamps: true }
);

const Leave = mongoose.model("Leave", LeaveSchema);
module.exports = Leave;
