const Joining = require("../models/joiningModel");
const { handleAsync } = require("../utils/attemptAndOtp");
const mongoose = require("mongoose");
const { emitNewFeed, emitFeedUpdate } = require("../utils/socketManager");
const {
  calculateIncentives,
  isEligibleStatus,
  getIncentiveRates,
} = require("../utils/incentiveCalculator");
const Candidate = require("../models/candidateModel");
const Lineup = require("../models/lineupModel");
const {
  checkCandidateLock,
  lockCandidate,
} = require("../utils/candidateLockManager");

/**
 * Updates incentives for a joining
 * @param {Object} joining - The joining document
 * @param {Boolean} isNew - Whether this is a new joining
 * @returns {Object} - The updated joining
 */
const updateJoiningIncentives = async (joining, isNew = false) => {
  // Only update incentives if status is eligible
  if (isEligibleStatus(joining.status)) {
    // Find all eligible joinings for the employee
    const employeeId = joining.createdBy;
    const allJoinings = await Joining.find({
      createdBy: employeeId,
      status: "Joining Details Received",
    });

    // Count international, domestic, and mid-lateral joinings
    const internationalCount = allJoinings.filter(
      (j) => j.joiningType === "International"
    ).length;
    const domesticCount = allJoinings.filter(
      (j) => j.joiningType === "Domestic"
    ).length;
    const midLateralCount = allJoinings.filter(
      (j) => j.joiningType === "Mid-Lateral"
    ).length;

    // Calculate incentives
    const incentiveResult = calculateIncentives({
      domestic: domesticCount,
      international: internationalCount,
      midLateral: midLateralCount,
    });

    // Determine incentive amount for this specific joining
    let joiningIncentiveAmount = 0;
    if (incentiveResult.eligible) {
      let ratePerJoining = 0;
      if (joining.joiningType === "International") {
        ratePerJoining = incentiveResult.internationalRate;
      } else if (joining.joiningType === "Domestic") {
        ratePerJoining = incentiveResult.domesticRate;
      } else if (joining.joiningType === "Mid-Lateral") {
        ratePerJoining = incentiveResult.midLateralRate;
      }

      joiningIncentiveAmount = ratePerJoining;
    }

    // Update the joining with incentive data
    joining.incentives = {
      eligible: incentiveResult.eligible,
      amount: joiningIncentiveAmount,
      calculated: true,
    };

    if (!isNew) {
      await joining.save();
    }
  } else {
    // If status is not eligible, set incentives to default values
    joining.incentives = {
      eligible: false,
      amount: 0,
      calculated: true,
    };

    if (!isNew) {
      await joining.save();
    }
  }

  return joining;
};

// Create a new joining
const createJoining = handleAsync(async (req, res) => {
  const {
    candidateName,
    contactNumber,
    company,
    process,
    salary,
    joiningDate,
    joiningType,
    remarks,
  } = req.body;

  console.log(req.body);

  if (
    !candidateName ||
    !contactNumber ||
    !company ||
    !process ||
    !joiningDate ||
    !remarks ||
    !joiningType
  ) {
    return res.status(400).json({
      success: false,
      message: "All required fields must be provided",
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
    // If candidate is locked by a different employee, prevent joining creation
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

  // Check if lineup exists with this contact number
  const lineup = await Lineup.findOne({
    contactNumber: contactNumber,
    company: company,
    process: process,
  });
  if (!lineup) {
    return res.status(404).json({
      success: false,
      message:
        "No lineup found with this contact number for the specified company and process. Please create a lineup first.",
    });
  }

  // Create the joining
  let joining = await Joining.create({
    candidateName,
    contactNumber,
    company,
    process,
    salary,
    joiningDate,
    joiningType,
    remarks,
    createdBy: req.employee._id,
  });

  // Lock the candidate for 90 days for the current employee or for the employee who created the lineup
  // This ensures the employee who lined up the candidate gets the lock for 90 days
  const lineupEmployeeId = lineup.createdBy;
  await lockCandidate(contactNumber, lineupEmployeeId, "joining");

  // Update candidate with joining status
  await Candidate.findOneAndUpdate(
    { mobileNo: contactNumber },
    {
      $push: {
        callStatusHistory: {
          status: "Joined",
          date: Date.now(),
          employee: req.employee._id,
        },
        remarks: {
          remark: remarks,
          date: Date.now(),
          employee: req.employee._id,
        },
      },
      callStatus: "Joined",
    }
  );

  // Update incentives
  joining = await updateJoiningIncentives(joining, true);
  await joining.save();

  // Emit WebSocket event for new joining
  emitNewFeed({
    employeeName: req.employee.name?.en || "Unknown",
    action: "Joining",
    candidateName: candidateName,
    company: company,
    process: process,
    timestamp: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    id: joining._id,
  });

  return res.status(201).json({
    success: true,
    message: "Joining created successfully",
    joining,
  });
});

// Get all joinings with pagination
const getAllJoinings = handleAsync(async (req, res) => {
  // Get all joinings for the employee
  const joinings = await Joining.find({
    createdBy: req.employee._id,
  })
    .populate("company", "companyName")
    .populate("createdBy", "name")
    .sort({ createdAt: -1 });

  // Find eligible joinings
  const eligibleJoinings = joinings.filter((joining) =>
    isEligibleStatus(joining.status)
  );

  // Count international, domestic, and mid-lateral joinings
  const internationalCount = eligibleJoinings.filter(
    (j) => j.joiningType === "International"
  ).length;
  const domesticCount = eligibleJoinings.filter(
    (j) => j.joiningType === "Domestic"
  ).length;
  const midLateralCount = eligibleJoinings.filter(
    (j) => j.joiningType === "Mid-Lateral"
  ).length;

  // Calculate incentives
  const incentiveResult = calculateIncentives({
    domestic: domesticCount,
    international: internationalCount,
    midLateral: midLateralCount,
  });

  // Update incentives for all joinings
  const updatePromises = joinings.map(async (joining) => {
    if (isEligibleStatus(joining.status) && incentiveResult.eligible) {
      let ratePerJoining = 0;

      if (joining.joiningType === "International") {
        ratePerJoining = incentiveResult.internationalRate;
      } else if (joining.joiningType === "Domestic") {
        ratePerJoining = incentiveResult.domesticRate;
      } else if (joining.joiningType === "Mid-Lateral") {
        ratePerJoining = incentiveResult.midLateralRate;
      }

      joining.incentives = {
        eligible: true,
        amount: ratePerJoining,
        calculated: true,
      };
    } else {
      joining.incentives = {
        eligible: false,
        amount: 0,
        calculated: true,
      };
    }

    return joining.save();
  });

  await Promise.all(updatePromises);

  const totalJoinings = joinings.length;

  return res.status(200).json({
    success: true,
    message: "Joinings fetched successfully",
    joinings,
    totalJoinings,
    incentiveSummary: {
      counts: {
        international: internationalCount,
        domestic: domesticCount,
        midLateral: midLateralCount,
        total: internationalCount + domesticCount + midLateralCount,
      },
      incentives: incentiveResult,
    },
  });
});

// Get joining by ID
const getJoiningById = handleAsync(async (req, res) => {
  const { joiningId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(joiningId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid joining ID format",
    });
  }

  const joining = await Joining.findById(joiningId)
    .populate("company", "companyName")
    .populate("createdBy", "name");

  if (!joining) {
    return res.status(404).json({
      success: false,
      message: "Joining not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Joining fetched successfully",
    joining,
  });
});

// Update joining
const updateJoining = handleAsync(async (req, res) => {
  const { joiningId } = req.params;
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(joiningId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid joining ID format",
    });
  }

  // Get the existing joining
  const existingJoining = await Joining.findById(joiningId);
  if (!existingJoining) {
    return res.status(404).json({
      success: false,
      message: "Joining not found",
    });
  }

  // Check if the candidate is locked by someone else
  const lockStatus = await checkCandidateLock(existingJoining.contactNumber);
  if (
    lockStatus &&
    lockStatus.isLocked &&
    lockStatus.lockedBy &&
    lockStatus.lockedBy._id.toString() !== req.employee._id.toString() &&
    existingJoining.createdBy.toString() !== lockStatus.lockedBy._id.toString()
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

  // Update the joining
  let joining = await Joining.findByIdAndUpdate(joiningId, updateData, {
    new: true,
    runValidators: true,
  });

  // Check if status is updated to "Joining Details Received"
  if (
    updateData.status &&
    updateData.status === "Joining Details Received" &&
    existingJoining.status !== "Joining Details Received"
  ) {
    // Ensure the candidate is locked for 90 days to the employee who created the lineup
    // Find the related lineup
    const lineup = await Lineup.findOne({
      contactNumber: joining.contactNumber,
      company: joining.company,
      process: joining.process,
    });

    if (lineup) {
      // Lock the candidate for the employee who created the lineup
      await lockCandidate(joining.contactNumber, lineup.createdBy, "joining");
    } else {
      // If no lineup found, lock for the current employee
      await lockCandidate(joining.contactNumber, req.employee._id, "joining");
    }

    // Update candidate status
    const candidate = await Candidate.findOne({
      mobileNo: joining.contactNumber,
    });
    if (candidate) {
      await Candidate.findByIdAndUpdate(candidate._id, {
        callStatus: "Joined",
        $push: {
          callStatusHistory: {
            status: "Joined",
            date: Date.now(),
            employee: req.employee._id,
          },
          remarks: {
            remark: `Joining status updated to ${updateData.status}`,
            date: Date.now(),
            employee: req.employee._id,
          },
        },
      });
    }
  }

  // Update incentives
  joining = await updateJoiningIncentives(joining);

  // Emit feed update
  emitFeedUpdate({
    id: joining._id,
    status: joining.status,
    timestamp: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  return res.status(200).json({
    success: true,
    message: "Joining updated successfully",
    joining,
  });
});

// Delete joining
const deleteJoining = handleAsync(async (req, res) => {
  const { joiningId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(joiningId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid joining ID format",
    });
  }

  const joining = await Joining.findByIdAndDelete(joiningId);

  if (!joining) {
    return res.status(404).json({
      success: false,
      message: "Joining not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Joining deleted successfully",
  });
});

// Delete multiple joinings
const deleteMultipleJoinings = handleAsync(async (req, res) => {
  const { joiningIds } = req.body;

  if (!joiningIds || !Array.isArray(joiningIds) || joiningIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Joining IDs are required",
    });
  }

  const result = await Joining.deleteMany({
    _id: { $in: joiningIds },
  });

  return res.status(200).json({
    success: true,
    message: `${result.deletedCount} joinings deleted successfully`,
  });
});

// Calculate incentives for employee
const calculateEmployeeIncentives = handleAsync(async (req, res) => {
  const employeeId = req.employee._id;
  const { startDate, endDate } = req.query;

  // Create date range filter
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  // Find all eligible joinings for the employee
  const joinings = await Joining.find({
    createdBy: employeeId,
    status: "Joining Details Received",
    ...dateFilter,
  });

  // Count international, domestic, and mid-lateral joinings
  const internationalCount = joinings.filter(
    (j) => j.joiningType === "International"
  ).length;
  const domesticCount = joinings.filter(
    (j) => j.joiningType === "Domestic"
  ).length;
  const midLateralCount = joinings.filter(
    (j) => j.joiningType === "Mid-Lateral"
  ).length;

  // Calculate incentives
  const incentiveResult = calculateIncentives({
    domestic: domesticCount,
    international: internationalCount,
    midLateral: midLateralCount,
  });

  // Update incentives for all eligible joinings
  if (incentiveResult.eligible) {
    const updatePromises = joinings.map(async (joining) => {
      let ratePerJoining = 0;
      if (joining.joiningType === "International") {
        ratePerJoining = incentiveResult.internationalRate;
      } else if (joining.joiningType === "Domestic") {
        ratePerJoining = incentiveResult.domesticRate;
      } else if (joining.joiningType === "Mid-Lateral") {
        ratePerJoining = incentiveResult.midLateralRate;
      }

      joining.incentives = {
        eligible: true,
        amount: ratePerJoining,
        calculated: true,
      };

      return joining.save();
    });

    await Promise.all(updatePromises);
  } else {
    // If not eligible, update all joinings to have zero incentives
    const updatePromises = joinings.map(async (joining) => {
      joining.incentives = {
        eligible: false,
        amount: 0,
        calculated: true,
      };

      return joining.save();
    });

    await Promise.all(updatePromises);
  }

  return res.status(200).json({
    success: true,
    message: "Incentives calculated successfully",
    data: {
      counts: {
        international: internationalCount,
        domestic: domesticCount,
        midLateral: midLateralCount,
        total: internationalCount + domesticCount + midLateralCount,
      },
      incentives: incentiveResult,
      period: {
        startDate: startDate || "all time",
        endDate: endDate || "current",
      },
    },
  });
});

// Recalculate incentives for all employee joinings
const recalculateAllIncentives = handleAsync(async (req, res) => {
  const employeeId = req.employee._id;

  // Find all joinings for the employee
  const allJoinings = await Joining.find({
    createdBy: employeeId,
  });

  // Find eligible joinings
  const eligibleJoinings = allJoinings.filter((joining) =>
    isEligibleStatus(joining.status)
  );

  const internationalCount = eligibleJoinings.filter(
    (j) => j.joiningType === "International"
  ).length;
  const domesticCount = eligibleJoinings.filter(
    (j) => j.joiningType === "Domestic"
  ).length;
  const midLateralCount = eligibleJoinings.filter(
    (j) => j.joiningType === "Mid-Lateral"
  ).length;

  // Calculate incentives based on all eligible joinings
  const incentiveResult = calculateIncentives({
    domestic: domesticCount,
    international: internationalCount,
    midLateral: midLateralCount,
  });

  // Update all joinings with appropriate incentive data
  const updatePromises = allJoinings.map(async (joining) => {
    if (isEligibleStatus(joining.status) && incentiveResult.eligible) {
      let ratePerJoining = 0;
      if (joining.joiningType === "International") {
        ratePerJoining = incentiveResult.internationalRate;
      } else if (joining.joiningType === "Domestic") {
        ratePerJoining = incentiveResult.domesticRate;
      } else if (joining.joiningType === "Mid-Lateral") {
        ratePerJoining = incentiveResult.midLateralRate;
      }

      joining.incentives = {
        eligible: true,
        amount: ratePerJoining,
        calculated: true,
      };
    } else {
      joining.incentives = {
        eligible: false,
        amount: 0,
        calculated: true,
      };
    }

    return joining.save();
  });

  await Promise.all(updatePromises);

  return res.status(200).json({
    success: true,
    message: "All joining incentives recalculated successfully",
    data: {
      counts: {
        international: internationalCount,
        domestic: domesticCount,
        midLateral: midLateralCount,
        total: internationalCount + domesticCount + midLateralCount,
        totalJoinings: allJoinings.length,
      },
      incentives: incentiveResult,
    },
  });
});

// Get incentive rates
const getIncentiveRatesInfo = handleAsync(async (req, res) => {
  const rates = getIncentiveRates();

  return res.status(200).json({
    success: true,
    message: "Incentive rates fetched successfully",
    data: rates,
  });
});

module.exports = {
  createJoining,
  getAllJoinings,
  getJoiningById,
  updateJoining,
  deleteJoining,
  deleteMultipleJoinings,
  calculateEmployeeIncentives,
  recalculateAllIncentives,
  getIncentiveRatesInfo,
};
