const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema(
  {
    name: { type: Object, required: true },
    employeeCode: { type: String, required: true, unique: true, index: true },
    designation: { type: String, required: false },
    mobile: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true }, // Hashed password
    userRole: { type: String, default: "employee" }, // Admin role
    permissions: {
      type: [String],
      default: ["manageUsers", "manageJobs", "viewReports"],
    }, // Admin privileges
    isEmailVerified: { type: Boolean, default: false },
    access_list: {
      type: Array,
      default: [
        "joinings",
        "lineups",
        "walkins",
        "activities",
        "call-info",
        "call-details",
        "notifications",
        "leaves",
        "edit-profile",
        "dashboard",
      ],
    },
    address: {
      type: String,
      required: false,
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    emergencyContact: {
      name: { type: String, required: false },
      number: { type: String, required: false },
      relation: { type: String, required: false },
    },
    bankDetails: {
      bankName: { type: String, required: false },
      branch: { type: String, required: false },
      ifsc: { type: String, required: false },
      accountNumber: { type: String, required: false },
      beneficiaryAddress: { type: String, required: false },
    },

    profileImage: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "Active",
      enum: ["Active", "Inactive"],
    },
    joiningDate: {
      type: Date,
    },
    role: {
      type: String,
      required: false,
      default: "Employee",
    },
    lang: {
      type: String,
      default: "en",
    },
  },
  { timestamps: true }
);

const Employee = mongoose.model("Employee", EmployeeSchema);
module.exports = Employee;
