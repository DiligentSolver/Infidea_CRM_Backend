const mongoose = require("mongoose");
const dateUtils = require("../utils/dateUtils");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "candidate_duplicity_check",
        "system",
        "other",
        "candidate_marked",
      ],
      default: "system",
    },
    status: {
      type: String,
      enum: ["read", "unread"],
      default: "unread",
    },
    metadata: {
      candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Candidate",
      },
      candidateName: String,
      candidateContactNumber: String,
      employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
      employeeName: String,
    },
    expiresAt: {
      type: Date,
      default: function () {
        // Set expiration to 30 days from now using dateUtils
        return dateUtils.addTime(dateUtils.getCurrentDate(), 30, "days");
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding unread notifications efficiently
notificationSchema.index({ recipient: 1, status: 1 });
// Index for cleaning up expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
