const Walkin = require("../models/walkinModel");
const { handleAsync } = require("../utils/attemptAndOtp");
const mongoose = require("mongoose");
const Candidate = require("../models/candidateModel");

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

  // Create the walkin
  const walkin = await Walkin.create({
    candidateName,
    contactNumber,
    walkinDate,
    remarks,
    createdBy: req.employee._id,
  });

  // Update candidate's walkinDate if candidate exists and lastRegisteredBy matches
  const candidate = await Candidate.findOne({ mobileNo: contactNumber });
  if (
    candidate &&
    candidate.lastRegisteredBy &&
    candidate.lastRegisteredBy.toString() === req.employee._id.toString()
  ) {
    await Candidate.findByIdAndUpdate(candidate._id, { walkinDate });
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

  const walkin = await Walkin.findByIdAndUpdate(walkinId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!walkin) {
    return res.status(404).json({
      success: false,
      message: "Walkin not found",
    });
  }

  // Update candidate's walkinDate if candidate exists and lastRegisteredBy matches
  const candidate = await Candidate.findOne({ mobileNo: walkin.contactNumber });
  if (
    candidate &&
    candidate.lastRegisteredBy &&
    candidate.lastRegisteredBy.toString() === req.employee._id.toString()
  ) {
    const remarksHistory = [];
    remarksHistory.push({
      remark: walkin.remarks,
      date: new Date(),
      employee: req.employee._id,
    });

    await Candidate.findByIdAndUpdate(candidate._id, {
      remarks: remarksHistory,
      walkinDate: walkin.walkinDate,
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
