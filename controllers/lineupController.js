const Lineup = require("../models/lineupModel");
const { handleAsync } = require("../utils/attemptAndOtp");
const mongoose = require("mongoose");
const Candidate = require("../models/candidateModel");
const { emitNewFeed, emitFeedUpdate } = require("../utils/socketManager");
const {
  checkCandidateLock,
  lockCandidate,
} = require("../utils/candidateLockManager");
const Joining = require("../models/joiningModel");

// Helper function to check if a lineup is part of an active joining
const isLineupInActiveJoining = async (contactNumber, company, process) => {
  const activeJoining = await Joining.findOne({
    contactNumber,
    company,
    process,
  });

  return !!activeJoining;
};

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
    lineupRemarks,
    // Joining fields (required when status is "Joined")
    joiningDate,
    joiningType,
    salary,
    joiningRemarks,
  } = req.body;

  if (
    !name ||
    !contactNumber ||
    !company ||
    !process ||
    !lineupDate ||
    !interviewDate ||
    !status
  ) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  // Check if status is "Joined" and validate required joining fields
  if (status === "Joined") {
    if (!joiningDate || !joiningType) {
      return res.status(400).json({
        success: false,
        message:
          "When status is Joined, joining date and joining type are required",
      });
    }

    // Validate joiningType
    if (!["International", "Domestic", "Mid-Lateral"].includes(joiningType)) {
      return res.status(400).json({
        success: false,
        message:
          "Joining type must be either 'International', 'Domestic', or 'Mid-Lateral'",
      });
    }
  }

  // Check if the lineup is already part of an active joining
  const hasActiveJoining = await isLineupInActiveJoining(
    contactNumber,
    company,
    process
  );
  if (hasActiveJoining) {
    return res.status(409).json({
      success: false,
      message:
        "This candidate already has an active joining for this company and process",
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
    // If candidate is locked by a different employee, prevent lineup creation
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

  // Check for existing lineup with same key details to prevent duplicates
  const existingLineup = await Lineup.findOne({
    contactNumber,
    company,
    process,
    createdBy: req.employee._id,
  });

  if (existingLineup) {
    return res.status(409).json({
      success: false,
      message: "A lineup with these details already exists",
      lineup: existingLineup,
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
    remarks: lineupRemarks,
  });

  // Update candidate's lineup fields
  if (
    candidate.lastRegisteredBy &&
    candidate.lastRegisteredBy.toString() === req.employee._id.toString()
  ) {
    const remarkHistory = {
      remark: lineupRemarks,
      date: Date.now(),
      employee: req.employee._id,
    };

    // Update callStatus based on lineup status
    const callStatus = status === "Joined" ? "Joined" : "Lineup";

    await Candidate.findByIdAndUpdate(candidate._id, {
      lineupCompany: company,
      customLineupCompany: customCompany,
      lineupProcess: process,
      customLineupProcess: customProcess,
      lineupDate,
      interviewDate,
      callStatus,
      $push: {
        remarks: remarkHistory,
        callStatusHistory: {
          status: callStatus,
          date: Date.now(),
          employee: req.employee._id,
        },
      },
    });
  }

  // If status is "Joined", create a joining record
  if (status === "Joined") {
    // Create a joining record
    await Joining.create({
      candidateName: name,
      contactNumber,
      company,
      process,
      joiningType,
      salary,
      joiningDate,
      status: "Pending",
      remarks: joiningRemarks || lineupRemarks,
      createdBy: req.employee._id,
    });

    // Lock the candidate for 90 days for the current employee
    await lockCandidate(contactNumber, req.employee._id, "joining");
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

  if (lineups.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No lineups found",
      lineups: [],
      totalLineups: 0,
    });
  }

  // Add editable property and candidate lineup count to each lineup
  const lineupResultsPromises = lineups.map(async (lineup) => {
    // Check if this lineup is part of an active joining
    const inActiveJoining = await isLineupInActiveJoining(
      lineup.contactNumber,
      lineup.company,
      lineup.process
    );

    const joining = await Joining.findOne({
      contactNumber: lineup.contactNumber,
      company: lineup.company,
      process: lineup.process,
    });

    // Get count of all lineups for this candidate by the current employee
    const candidateLineupCount = await Lineup.countDocuments({
      contactNumber: lineup.contactNumber,
      createdBy: req.employee._id,
    });

    // A lineup is not editable if it's part of an active joining or has Offer Drop status
    const editable = !inActiveJoining && lineup.status !== "Offer Drop";

    return {
      ...lineup.toObject(),
      editable,
      hasActiveJoining: inActiveJoining,
      joining,
      candidateLineupCount,
    };
  });

  const lineupResults = await Promise.all(lineupResultsPromises);

  return res.status(200).json({
    success: true,
    message: "Lineups fetched successfully",
    lineups: lineupResults,
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

  // Check if this lineup is part of an active joining
  const inActiveJoining = await isLineupInActiveJoining(
    lineup.contactNumber,
    lineup.company,
    lineup.process
  );

  // A lineup is not editable if it's part of an active joining or has Offer Drop status
  const editable = !inActiveJoining && lineup.status !== "Offer Drop";

  const lineupResult = {
    ...lineup.toObject(),
    editable,
    hasActiveJoining: inActiveJoining,
  };

  return res.status(200).json({
    success: true,
    message: "Lineup fetched successfully",
    lineup: lineupResult,
  });
});

// Update lineup
const updateLineup = handleAsync(async (req, res) => {
  const { lineupId } = req.params;
  const updateData = req.body;

  console.log(updateData);

  if (!mongoose.Types.ObjectId.isValid(lineupId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid lineup ID format",
    });
  }

  // Get the existing lineup
  const existingLineup = await Lineup.findById(lineupId);
  if (!existingLineup) {
    return res.status(404).json({
      success: false,
      message: "Lineup not found",
    });
  }

  // Check if this lineup is part of an active joining
  const inActiveJoining = await isLineupInActiveJoining(
    existingLineup.contactNumber,
    existingLineup.company,
    existingLineup.process
  );

  // Prevent editing if status is "Offer Drop"
  if (existingLineup.status === "Offer Drop") {
    return res.status(403).json({
      success: false,
      message: "This lineup cannot be edited as it has Offer Drop status",
    });
  }

  // Check for active joining separately
  if (inActiveJoining) {
    return res.status(403).json({
      success: false,
      message: "This lineup cannot be edited as it's part of an active joining",
      hasActiveJoining: true,
    });
  }

  // Check if updating to "Joined" status
  if (updateData.status === "Joined" && existingLineup.status !== "Joined") {
    // Validate required joining fields
    const { joiningDate, joiningType } = updateData;

    if (!joiningDate || !joiningType) {
      return res.status(400).json({
        success: false,
        message:
          "When status is Joined, joining date and joining type are required",
      });
    }

    // Validate joiningType
    if (!["International", "Domestic", "Mid-Lateral"].includes(joiningType)) {
      return res.status(400).json({
        success: false,
        message:
          "Joining type must be either 'International', 'Domestic', or 'Mid-Lateral'",
      });
    }
  }

  // Check if the candidate is locked by someone else
  const lockStatus = await checkCandidateLock(existingLineup.contactNumber);
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

  // If no remarks provided in update, keep the existing remarks
  if (
    updateData.remarks === undefined ||
    updateData.remarks === null ||
    updateData.remarks === ""
  ) {
    updateData.remarks = existingLineup.remarks;
  }

  // Update the lineup
  const lineup = await Lineup.findByIdAndUpdate(lineupId, updateData, {
    new: true,
    runValidators: true,
  }).populate("company", "companyName");

  // Update candidate record if status changed to reflect in candidate history
  if (updateData.status && updateData.status !== existingLineup.status) {
    const candidate = await Candidate.findOne({
      mobileNo: lineup.contactNumber,
    });
    if (candidate) {
      const remarkHistory = {
        remark: `Lineup status updated to ${updateData.status}`,
        date: Date.now(),
        employee: req.employee._id,
      };

      await Candidate.findByIdAndUpdate(candidate._id, {
        $push: {
          remarks: remarkHistory,
          callStatusHistory: {
            status: `Lineup: ${updateData.status}`,
            date: Date.now(),
            employee: req.employee._id,
          },
        },
      });

      // If status changed to "Joined", update callStatus as well
      if (updateData.status === "Joined") {
        await Candidate.findByIdAndUpdate(candidate._id, {
          callStatus: "Joined",
        });
      }
    }
  }

  // If status is updated to "Joined", create a joining record
  if (updateData.status === "Joined" && existingLineup.status !== "Joined") {
    const { joiningDate, joiningType, salary, joiningRemarks } = updateData;

    // Check if a joining already exists for this candidate, company and process
    const existingJoining = await Joining.findOne({
      contactNumber: existingLineup.contactNumber,
      company: existingLineup.company,
      process: existingLineup.process,
    });

    if (!existingJoining) {
      // Create a joining record
      await Joining.create({
        candidateName: existingLineup.name,
        contactNumber: existingLineup.contactNumber,
        company: existingLineup.company,
        process: existingLineup.process,
        joiningType,
        salary,
        joiningDate,
        status: "Pending",
        remarks: joiningRemarks,
        createdBy: req.employee._id,
      });
    }

    // Lock the candidate for 90 days for the current employee
    await lockCandidate(
      existingLineup.contactNumber,
      req.employee._id,
      "joining"
    );
  }

  // Emit WebSocket event for lineup update
  emitFeedUpdate({
    id: lineup._id,
    status: lineup.status,
    timestamp: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

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

  const lineup = await Lineup.findById(lineupId);

  if (!lineup) {
    return res.status(404).json({
      success: false,
      message: "Lineup not found",
    });
  }

  // Check if this lineup is part of an active joining
  const inActiveJoining = await isLineupInActiveJoining(
    lineup.contactNumber,
    lineup.company,
    lineup.process
  );

  // A lineup is not deletable if it's part of an active joining
  if (inActiveJoining) {
    return res.status(403).json({
      success: false,
      message:
        "This lineup cannot be deleted as it's part of an active joining",
      hasActiveJoining: true,
    });
  }

  await Lineup.findByIdAndDelete(lineupId);

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

  // For each lineup, check if it's part of an active joining
  const lineups = await Lineup.find({ _id: { $in: lineupIds } });

  const undeleteableLineups = [];
  const deleteableLineups = [];

  for (const lineup of lineups) {
    const inActiveJoining = await isLineupInActiveJoining(
      lineup.contactNumber,
      lineup.company,
      lineup.process
    );

    if (inActiveJoining) {
      undeleteableLineups.push(lineup._id);
    } else {
      deleteableLineups.push(lineup._id);
    }
  }

  if (undeleteableLineups.length > 0 && deleteableLineups.length === 0) {
    return res.status(403).json({
      success: false,
      message:
        "None of the selected lineups can be deleted as they are part of active joinings",
      undeleteableLineups,
    });
  }

  const result = await Lineup.deleteMany({
    _id: { $in: deleteableLineups },
  });

  return res.status(200).json({
    success: true,
    message:
      undeleteableLineups.length > 0
        ? `${result.deletedCount} lineups deleted successfully. ${undeleteableLineups.length} lineups could not be deleted as they are part of active joinings.`
        : `${result.deletedCount} lineups deleted successfully`,
    undeleteableLineups:
      undeleteableLineups.length > 0 ? undeleteableLineups : undefined,
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
