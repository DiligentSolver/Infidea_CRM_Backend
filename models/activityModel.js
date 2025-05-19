const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "On Desk",
        "Lunch Break",
        "Team Meeting",
        "Client Meeting",
        "Office Celebration",
        "Interview Session",
        "Logout",
      ],
      default: "On Desk",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Create compound index to efficiently query for active activities per employee
ActivitySchema.index({ employeeId: 1, isActive: 1 });

const Activity = mongoose.model("Activity", ActivitySchema);
module.exports = Activity;
