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

      {
        path: "/dashboard",
        component: Dashboard,
      },
      {
        path: "/languages",
        component: Languages,
      },
      {
        path: "/users",
        component: Users,
      },
      {
        path: "/jobseeker/:id",
        component: JobSeeker,
      },
      {
        path: "/job/:id",
        component: Job,
      },
      {
        path: "/our-staff",
        component: Staff,
      },
      {
        path: "/companies",
        component: Companies,
      },
      {
        path: "/manage-companies",
        component: ManageCompanies,
      },
      {
        path: "/jobs",
        component: Jobs,
      },
      {
        path: "/post-job",
        component: PostJob,
      },
      {
        path: "/applicants",
        component: Applicants,
      },
      {
        path: "/activities",
        component: Activities,
      },
      {
        path: "/leaves",
        component: Leaves,
      },
      {
        path: "/404",
        component: Page404,
      },
      {
        path: "/edit-profile",
        component: EditProfile,
      },
      {
        path: "/notifications",
        component: Notifications,
      },
      {
        path: "/call-info",
        component: CallInfo,
      },
      {
        path: "/call-details",
        component: CallDetails,
      },
      {
        path: "/joinings",
        component: Joinings,
      },
      {
        path: "/lineups",
        component: Lineups,
      },
      {
        path: "/walkins",
        component: Walkins,
    }, // Admin privileges
    isEmailVerified: { type: Boolean, default: false },
    access_list: {
      type: Array,
      default: [
        "joinings",
        "lineups",
        "walkins",
        "activities",
        "callInfo",
        "callDetails",
        "notifications",
        "leaves",
        "editProfile",
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
