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
    !status ||
    !remarks
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
    remarks,
  });

  // Lock the candidate for 30 days for the current employee
  await lockCandidate(contactNumber, req.employee._id, "lineup");

  // Update candidate's lineup fields
  if (
    candidate.lastRegisteredBy &&
    candidate.lastRegisteredBy.toString() === req.employee._id.toString()
  ) {
    const remarkHistory = {
      remark: remarks,
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
      remarks: joiningRemarks || remarks,
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
