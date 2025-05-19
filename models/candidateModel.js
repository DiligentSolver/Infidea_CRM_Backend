const mongoose = require("mongoose");

const CandidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobileNo: { type: String, required: true, unique: true },
    whatsappNo: { type: String, required: true },
    source: { type: String, required: true },
    gender: { type: String, required: true },
    experience: { type: String, required: true },
    qualification: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    salaryExpectation: { type: String, required: true },
    communication: { type: String, required: true },
    noticePeriod: { type: String, required: true },
    shift: { type: String, required: true },
    relocation: { type: String, required: true },
    companyProfile: { type: String, required: true },
    callStatus: {
      type: String,
      default: "New",
    },
    callStatusHistory: [
      {
        status: { type: String, required: true },
        date: { type: Date, default: Date.now },
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    lastRegisteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    registrationLockExpiry: {
      type: Date,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    registrationHistory: [
      {
        registeredBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
        registrationDate: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["Active", "Expired"],
          default: "Active",
        },
      },
    ],
    callDurationHistory: [
      {
        duration: {
          type: String,
          required: true,
        },
        employee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        summary: {
          type: String,
        },
      },
    ],
    locality: { type: String },
    lineupCompany: { type: String },
    customCompanyProfile: { type: String },
    customLineupCompany: { type: String },
    lineupProcess: { type: String },
    customLineupProcess: { type: String },
    lineupDate: { type: String },
    interviewDate: { type: String },
    walkinDate: { type: String },
    workMode: {
      type: String,
      enum: ["Office", "Hybrid", "Any Mode"],
    },
    lineupRemarksHistory: [
      {
        remark: { type: String, required: true },
        date: { type: Date, default: Date.now },
        employee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
          required: true,
        },
        company: { type: String, required: true },
        process: { type: String, required: true },
        lineupDate: { type: Date, required: true },
        interviewDate: { type: Date, required: true },
      },
    ],
    walkinRemarksHistory: [
      {
        remark: { type: String, required: true },
        date: { type: Date, default: Date.now },
        employee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
          required: true,
        },
        walkinDate: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true }
);

const Candidate = mongoose.model("Candidate", CandidateSchema);
module.exports = Candidate;
