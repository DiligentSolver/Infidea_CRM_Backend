const Walkin = require("../models/walkinModel");
const { handleAsync } = require("../utils/attemptAndOtp");
const mongoose = require("mongoose");
const Candidate = require("../models/candidateModel");
const {
  checkCandidateLock,
  lockCandidate,
} = require("../utils/candidateLockManager");
const Joining = require("../models/joiningModel");

// Helper function to check if a walkin candidate is part of an active joining
const isWalkinInActiveJoining = async (contactNumber) => {
  const activeJoining = await Joining.findOne({
    contactNumber,
    status: "Joining Details Received",
  });

  return !!activeJoining;
};

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

  // Check if the walkin is already part of an active joining
  const hasActiveJoining = await isWalkinInActiveJoining(contactNumber);
  if (hasActiveJoining) {
    return res.status(409).json({
      success: false,
      message: "This candidate already has an active joining",
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

  if (walkins.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No walkins found",
      walkins: [],
      totalWalkins: 0,
    });
  }

  // Add editable property to each walkin
  const walkinResultsPromises = walkins.map(async (walkin) => {
    // Check if this walkin is part of an active joining
    const inActiveJoining = await isWalkinInActiveJoining(walkin.contactNumber);

    // A walkin is not editable if it's part of an active joining
    const editable = !inActiveJoining;

    return {
      ...walkin.toObject(),
      editable,
      hasActiveJoining: inActiveJoining,
    };
  });

  const walkinResults = await Promise.all(walkinResultsPromises);

  return res.status(200).json({
    success: true,
    message: "Walkins fetched successfully",
    walkins: walkinResults,
    totalWalkins: walkins.length,
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

  // Check if this walkin is part of an active joining
  const inActiveJoining = await isWalkinInActiveJoining(walkin.contactNumber);

  // A walkin is not editable if it's part of an active joining
  const editable = !inActiveJoining;

  const walkinResult = {
    ...walkin.toObject(),
    editable,
    hasActiveJoining: inActiveJoining,
  };

  return res.status(200).json({
    success: true,
    message: "Walkin fetched successfully",
    walkin: walkinResult,
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

  // Check if this walkin is part of an active joining
  const inActiveJoining = await isWalkinInActiveJoining(
    existingWalkin.contactNumber
  );

  // A walkin is not editable if it's part of an active joining
  if (inActiveJoining) {
    return res.status(403).json({
      success: false,
      message: "This walkin cannot be edited as it's part of an active joining",
      hasActiveJoining: true,
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

  const walkin = await Walkin.findById(walkinId);

  if (!walkin) {
    return res.status(404).json({
      success: false,
      message: "Walkin not found",
    });
  }

  // Check if this walkin is part of an active joining
  const inActiveJoining = await isWalkinInActiveJoining(walkin.contactNumber);

  // A walkin is not deletable if it's part of an active joining
  if (inActiveJoining) {
    return res.status(403).json({
      success: false,
      message:
        "This walkin cannot be deleted as it's part of an active joining",
      hasActiveJoining: true,
    });
  }

  await Walkin.findByIdAndDelete(walkinId);

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

  // For each walkin, check if it's part of an active joining
  const walkins = await Walkin.find({ _id: { $in: walkinIds } });

  const undeleteableWalkins = [];
  const deleteableWalkins = [];

  for (const walkin of walkins) {
    const inActiveJoining = await isWalkinInActiveJoining(walkin.contactNumber);

    if (inActiveJoining) {
      undeleteableWalkins.push(walkin._id);
    } else {
      deleteableWalkins.push(walkin._id);
    }
  }

  if (undeleteableWalkins.length > 0 && deleteableWalkins.length === 0) {
    return res.status(403).json({
      success: false,
      message:
        "None of the selected walkins can be deleted as they are part of active joinings",
      undeleteableWalkins,
    });
  }

  const result = await Walkin.deleteMany({
    _id: { $in: deleteableWalkins },
  });

  return res.status(200).json({
    success: true,
    message:
      undeleteableWalkins.length > 0
        ? `${result.deletedCount} walkins deleted successfully. ${undeleteableWalkins.length} walkins could not be deleted as they are part of active joinings.`
        : `${result.deletedCount} walkins deleted successfully`,
    undeleteableWalkins:
      undeleteableWalkins.length > 0 ? undeleteableWalkins : undefined,
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
