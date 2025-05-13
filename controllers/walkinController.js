const Walkin = require("../models/walkinModel");
const { handleAsync } = require("../utils/attemptAndOtp");
const mongoose = require("mongoose");
const Candidate = require("../models/candidateModel");
const {
  checkCandidateLock,
  lockCandidate,
} = require("../utils/candidateLockManager");

// Create a new walkin
const createWalkin = handleAsync(async (req, res) => {
  const { candidateName, contactNumber, walkinDate, remarks } = req.body;

  console.log(req.body);

  if (!candidateName || !contactNumber || !walkinDate || !remarks) {
    return res.status(400).json({
      success: false,
      message: "All required fields must be provided",
    });
  }

  // Check if candidate exists with this contact number
  const candidate = await Candidate.findOne({ mobileNo: contactNumber });
  if (!candidate) {
    return res.status(404).json({
      success: false,
      message:
        "No candidate found with this contact number. Please register the candidate first.",
    });
  }

  // Check if candidate is locked by a different employee
  const lockStatus = await checkCandidateLock(contactNumber);

  if (lockStatus && lockStatus.isLocked) {
    // If candidate is locked by a different employee, prevent walkin creation
    if (
      lockStatus.lockedBy &&
      lockStatus.lockedBy._id.toString() !== req.employee._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "This candidate is locked by another employee",
        lockedBy: lockStatus.lockedBy.name?.en || "Unknown",
        remainingDays: lockStatus.remainingDays,
        remainingTime: lockStatus.remainingTime,
        lockExpiryDate: lockStatus.lockExpiryDate,
      });
    }
  }

  // Create the walkin
  const walkin = await Walkin.create({
    candidateName,
    contactNumber,
    walkinDate,
    remarks,
    createdBy: req.employee._id,
  });

  // Lock the candidate for 30 days for the current employee
  await lockCandidate(contactNumber, req.employee._id, "walkin");

  // Update candidate's walkinDate if candidate exists
  if (candidate) {
    const remarkHistory = {
      remark: remarks,
      date: Date.now(),
      employee: req.employee._id,
    };

    // Update callStatus to 'Walkin at Infidea' if not already set
    await Candidate.findByIdAndUpdate(candidate._id, {
      walkinDate,
      callStatus: "Walkin at Infidea",
      lastRegisteredBy: req.employee._id,
      $push: {
        remarks: remarkHistory,
        callStatusHistory: {
          status: "Walkin at Infidea",
          date: Date.now(),
          employee: req.employee._id,
        },
      },
    });
  }

  return res.status(201).json({
    success: true,
    message: "Walkin created successfully",
    walkin,
  });
});

// Get all walkins with pagination
const getAllWalkins = handleAsync(async (req, res) => {
  const walkins = await Walkin.find({ createdBy: req.employee._id })
    .populate("createdBy", "name")
    .sort({ createdAt: -1 });

  const totalWalkins = await Walkin.countDocuments();

  return res.status(200).json({
    success: true,
    message: "Walkins fetched successfully",
    walkins,
    totalWalkins,
  });
});

// Get walkin by ID
const getWalkinById = handleAsync(async (req, res) => {
  const { walkinId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(walkinId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid walkin ID format",
    });
  }

  const walkin = await Walkin.findById(walkinId).populate("createdBy", "name");

  if (!walkin) {
    return res.status(404).json({
      success: false,
      message: "Walkin not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Walkin fetched successfully",
    walkin,
  });
});

// Update walkin
const updateWalkin = handleAsync(async (req, res) => {
  const { walkinId } = req.params;
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(walkinId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid walkin ID format",
    });
  }

  // Get the existing walkin
  const existingWalkin = await Walkin.findById(walkinId);
  if (!existingWalkin) {
    return res.status(404).json({
      success: false,
      message: "Walkin not found",
    });
  }

  // Check if the candidate is locked by someone else
  const lockStatus = await checkCandidateLock(existingWalkin.contactNumber);
  if (
    lockStatus &&
    lockStatus.isLocked &&
    lockStatus.lockedBy &&
    lockStatus.lockedBy._id.toString() !== req.employee._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "This candidate is locked by another employee",
      lockedBy: lockStatus.lockedBy.name?.en || "Unknown",
      remainingDays: lockStatus.remainingDays,
      remainingTime: lockStatus.remainingTime,
      lockExpiryDate: lockStatus.lockExpiryDate,
    });
  }

  // Update the walkin
  const walkin = await Walkin.findByIdAndUpdate(walkinId, updateData, {
    new: true,
    runValidators: true,
  });

  // Update candidate's walkinDate and remarks
  const candidate = await Candidate.findOne({ mobileNo: walkin.contactNumber });
  if (candidate) {
    const remarkHistory = {
      remark: walkin.remarks,
      date: Date.now(),
      employee: req.employee._id,
    };

    await Candidate.findByIdAndUpdate(candidate._id, {
      walkinDate: walkin.walkinDate,
      $push: { remarks: remarkHistory },
    });
  }

  return res.status(200).json({
    success: true,
    message: "Walkin updated successfully",
    walkin,
  });
});

// Delete walkin
const deleteWalkin = handleAsync(async (req, res) => {
  const { walkinId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(walkinId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid walkin ID format",
    });
  }

  const walkin = await Walkin.findByIdAndDelete(walkinId);

  if (!walkin) {
    return res.status(404).json({
      success: false,
      message: "Walkin not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Walkin deleted successfully",
  });
});

// Delete multiple walkins
const deleteMultipleWalkins = handleAsync(async (req, res) => {
  const { walkinIds } = req.body;

  if (!walkinIds || !Array.isArray(walkinIds) || walkinIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Walkin IDs are required",
    });
  }

  const result = await Walkin.deleteMany({
    _id: { $in: walkinIds },
  });

  return res.status(200).json({
    success: true,
    message: `${result.deletedCount} walkins deleted successfully`,
  });
});

module.exports = {
  createWalkin,
  getAllWalkins,
  getWalkinById,
  updateWalkin,
  deleteWalkin,
  deleteMultipleWalkins,
};
