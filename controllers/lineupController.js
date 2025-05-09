const Lineup = require("../models/lineupModel");
const { handleAsync } = require("../utils/attemptAndOtp");
const mongoose = require("mongoose");
const Candidate = require("../models/candidateModel");
const { emitNewFeed, emitFeedUpdate } = require("../utils/socketManager");
const { checkCandidateLock } = require("../utils/candidateLockManager");

// Create a new lineup
const createLineup = handleAsync(async (req, res) => {
  const {
    name,
    contactNumber,
    company,
    process,
    lineupDate,
    interviewDate,
    status,
    customCompany,
    customProcess,
    remarks,
  } = req.body;

  if (
    !name ||
    !contactNumber ||
    !company ||
    !process ||
    !lineupDate ||
    !interviewDate ||
    !status ||
    !remarks
  ) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  // Check if candidate exists and is locked using the utility function
  const lockStatus = await checkCandidateLock(contactNumber);
  if (lockStatus && lockStatus.isLocked) {
    return res.status(403).json({
      success: false,
      message: "This candidate is locked for 90 days due to selection status",
      lockExpiryDate: lockStatus.lockExpiryDate,
    });
  }

  // Create the lineup
  const lineup = await Lineup.create({
    name,
    contactNumber,
    company,
    process,
    lineupDate,
    interviewDate,
    status,
    customCompany,
    customProcess,
    createdBy: req.employee._id,
    remarks,
  });

  // Update candidate's lineup fields if candidate exists and lastRegisteredBy matches
  const candidate = await Candidate.findOne({ mobileNo: contactNumber });
  if (
    candidate &&
    candidate.lastRegisteredBy &&
    candidate.lastRegisteredBy.toString() === req.employee._id.toString()
  ) {
    await Candidate.findByIdAndUpdate(candidate._id, {
      lineupCompany: company,
      customLineupCompany: customCompany,
      lineupProcess: process,
      customLineupProcess: customProcess,
      lineupDate,
      interviewDate,
      remarks,
    });
  }

  // Emit WebSocket event for new lineup
  emitNewFeed({
    employeeName: req.employee.name?.en || "Unknown",
    action: "Lineup",
    candidateName: name,
    company: company,
    process: process,
    timestamp: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    status: status,
    id: lineup._id,
  });

  return res.status(201).json({
    success: true,
    message: "Lineup created successfully",
    lineup,
  });
});

// Get all lineups with pagination
const getAllLineups = handleAsync(async (req, res) => {
  const lineups = await Lineup.find({ createdBy: req.employee._id }).sort({
    createdAt: -1,
  });

  return res.status(200).json({
    success: true,
    message: "Lineups fetched successfully",
    lineups,
    totalLineups: lineups.length,
  });
});

// Get lineup by ID
const getLineupById = handleAsync(async (req, res) => {
  const { lineupId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(lineupId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid lineup ID format",
    });
  }

  const lineup = await Lineup.findById(lineupId)
    .populate("company", "companyName")
    .populate("createdBy", "name");

  if (!lineup) {
    return res.status(404).json({
      success: false,
      message: "Lineup not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Lineup fetched successfully",
    lineup,
  });
});

// Update lineup
const updateLineup = handleAsync(async (req, res) => {
  const { lineupId } = req.params;
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(lineupId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid lineup ID format",
    });
  }

  const lineup = await Lineup.findByIdAndUpdate(lineupId, updateData, {
    new: true,
    runValidators: true,
  }).populate("company", "companyName");

  if (!lineup) {
    return res.status(404).json({
      success: false,
      message: "Lineup not found",
    });
  }

  // Update candidate's lineup fields if candidate exists and lastRegisteredBy matches
  const candidate = await Candidate.findOne({ mobileNo: lineup.contactNumber });
  if (
    candidate &&
    candidate.lastRegisteredBy &&
    candidate.lastRegisteredBy.toString() === req.employee._id.toString()
  ) {
    const remarksHistory = [];
    remarksHistory.push({
      remark: lineup.remarks,
      date: new Date(),
      employee: req.employee._id,
    });

    const updateCandidate = {
      lineupCompany: lineup.company,
      customLineupCompany: lineup.customCompany,
      lineupProcess: lineup.process,
      customLineupProcess: lineup.customProcess,
      lineupDate: lineup.lineupDate,
      interviewDate: lineup.interviewDate,
      remarks: remarksHistory,
    };

    // If status is "Selected", lock the candidate for 90 days
    if (updateData.status === "Selected") {
      // Calculate date 90 days from now
      const lockExpiryDate = new Date();
      lockExpiryDate.setDate(lockExpiryDate.getDate() + 90);

      updateCandidate.status = "Selected";
      updateCandidate.isLocked = true;
      updateCandidate.registrationLockExpiry = lockExpiryDate;
    }

    await Candidate.findByIdAndUpdate(candidate._id, updateCandidate);
  }

  // Emit WebSocket event for lineup update if status changed to "Selected"
  if (updateData.status === "Selected") {
    emitNewFeed({
      employeeName: req.employee.name?.en || "Unknown",
      action: "Selection",
      candidateName: lineup.name,
      company: lineup.company,
      process: lineup.process,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "Selected",
      id: lineup._id,
    });
  } else {
    // Emit regular update event
    emitFeedUpdate(lineupId, {
      status: lineup.status,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  return res.status(200).json({
    success: true,
    message: "Lineup updated successfully",
    lineup,
  });
});

// Delete lineup
const deleteLineup = handleAsync(async (req, res) => {
  const { lineupId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(lineupId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid lineup ID format",
    });
  }

  const lineup = await Lineup.findByIdAndDelete(lineupId);

  if (!lineup) {
    return res.status(404).json({
      success: false,
      message: "Lineup not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Lineup deleted successfully",
  });
});

// Delete multiple lineups
const deleteMultipleLineups = handleAsync(async (req, res) => {
  const { lineupIds } = req.body;

  if (!lineupIds || !Array.isArray(lineupIds) || lineupIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Lineup IDs are required",
    });
  }

  const result = await Lineup.deleteMany({
    _id: { $in: lineupIds },
  });

  return res.status(200).json({
    success: true,
    message: `${result.deletedCount} lineups deleted successfully`,
  });
});

module.exports = {
  createLineup,
  getAllLineups,
  getLineupById,
  updateLineup,
  deleteLineup,
  deleteMultipleLineups,
};
