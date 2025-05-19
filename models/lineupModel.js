const mongoose = require("mongoose");

const LineupSchema = new mongoose.Schema(
  {
    name: {
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
    customCompany: {
      type: String,
      required: false,
    },
    process: {
      type: String,
      required: true,
    },
    customProcess: {
      type: String,
      required: false,
    },
    lineupDate: {
      type: Date,
      required: true,
    },
    interviewDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "Scheduled",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    lineupRemarks: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

const Lineup = mongoose.model("Lineup", LineupSchema);
module.exports = Lineup;
