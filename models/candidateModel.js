const mongoose = require("mongoose");

const CandidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobileNo: { type: String, required: true, unique: true },
    whatsappNo: { type: String },
    source: { type: String },
    gender: { type: String },
    experience: { type: String },
    qualification: { type: String },
    passingYear: { type: String },
    state: { type: String },
    city: { type: String },
    salaryExpectation: { type: String },
    communication: { type: String },
    noticePeriod: { type: String },
    shift: { type: String },
    relocation: { type: String },
    companyProfile: { type: String },
    callStatus: {
      type: String,
      default: "New",
    },
    callStatusHistory: [
      {
        status: { type: String },
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
        },
        employee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
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
        },
        company: { type: String },
        process: { type: String },
        lineupDate: { type: Date },
        interviewDate: { type: Date },
      },
    ],
    walkinRemarksHistory: [
      {
        remark: { type: String, required: true },
        date: { type: Date, default: Date.now },
        employee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
        walkinDate: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

const Candidate = mongoose.model("Candidate", CandidateSchema);
module.exports = Candidate;
