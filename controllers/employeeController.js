const Employee = require("../models/employeeModel");
const { handleAsync } = require("../utils/attemptAndOtp");
const { handleEncryptData } = require("../config/auth");
const formatAndValidateMobile = require("../utils/validators/formatMobileNumber");
const { formatAndValidateEmail } = require("../utils/validators/formatEmail");

//Send Employee Data
const sendEmployeeDetails = handleAsync(async (req, res) => {
  if (!req.employee || !req.employee._id) {
    return res
      .status(400)
      .json({ message: "Invalid request. User ID missing." });
  }

  const employee = await Employee.findById(req.employee._id).select(
    "-password -access_list"
  ); // Exclude sensitive fields

  return res.status(200).json({ message: "Employee found", employee });
});

// Update Employee Profile
const updateEmployeeProfile = handleAsync(async (req, res) => {
  const { profileData } = req.body;

  const formattedEmail = formatAndValidateEmail(profileData.email);
  const formattedMobile = formatAndValidateMobile(profileData.mobile);

  const employee = await Employee.findById(req.employee._id).select(
    "-password"
  );
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  if (formattedEmail) {
    const existingEmployee = await Employee.findOne({ email: formattedEmail });
    if (
      existingEmployee &&
      existingEmployee._id.toString() !== employee._id.toString()
    ) {
      return res.status(400).json({ message: "Email already exists" });
    }
  }

  if (formattedMobile) {
    const existingEmployee = await Employee.findOne({
      mobile: formattedMobile,
    });
    if (
      existingEmployee &&
      existingEmployee._id.toString() !== employee._id.toString()
    ) {
      return res.status(400).json({ message: "Mobile already exists" });
    }
  }

  const updatedEmployee = await Employee.findByIdAndUpdate(
    req.employee._id,
    profileData,
    {
      new: true,
      runValidators: true,
    }
  );

  const { data, iv } = handleEncryptData([
    ...updatedEmployee?.access_list,
    updatedEmployee.role,
  ]);

  res.status(200).json({
    message: "Profile updated successfully",
    employee: updatedEmployee,
    data,
    iv,
  });
});

const getProfileImageUrl = handleAsync(async (req, res) => {
  const employee = await Employee.findById(req.employee._id);
  if (!employee) return res.status(404).json({ message: "Employee not found" });
  return res.status(200).json({
    message: "Profile picture updated successfully",
    profileImage: employee.profileImage,
  });
});

const updateProfilePicture = handleAsync(async (req, res) => {
  const { profileImage } = req.body;
  const employee = await Employee.findById(req.employee._id);
  if (!employee) return res.status(404).json({ message: "Employee not found" });
  employee.profileImage = profileImage;
  await employee.save();
  return res
    .status(200)
    .json({ message: "Profile picture updated successfully" });
});

module.exports = {
  sendEmployeeDetails,
  updateEmployeeProfile,
  updateProfilePicture,
  getProfileImageUrl,
};
