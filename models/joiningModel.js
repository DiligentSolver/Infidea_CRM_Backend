const mongoose = require("mongoose");

const JoiningSchema = new mongoose.Schema(
  {
    candidateName: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    process: {
      type: String,
      required: true,
    },
    joiningType: {
      type: String,
      enum: ["International", "Domestic", "Mid-Lateral"],
      required: true,
    },
    salary: {
      type: String,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Joining Details Received",
        "Joining Details Not Received",
      ],
      default: "Pending",
    },
    incentives: {
      eligible: {
        type: Boolean,
        default: false,
      },
      amount: {
        type: Number,
        default: 0,
      },
      calculated: {
        type: Boolean,
        default: false,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true }
);

const Joining = mongoose.model("Joining", JoiningSchema);
module.exports = Joining;
