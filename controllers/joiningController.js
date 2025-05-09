const Joining = require("../models/joiningModel");
const { handleAsync } = require("../utils/attemptAndOtp");
const mongoose = require("mongoose");
const { emitNewFeed, emitFeedUpdate } = require("../utils/socketManager");
const {
  calculateIncentives,
  isEligibleStatus,
  getIncentiveRates,
} = require("../utils/incentiveCalculator");

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

    // Count international and domestic joinings
    const internationalCount = allJoinings.filter(
      (j) => j.joiningType === "International"
    ).length;
    const domesticCount = allJoinings.filter(
      (j) => j.joiningType === "Domestic"
    ).length;

    // Calculate incentives
    const incentiveResult = calculateIncentives({
      domestic: domesticCount,
      international: internationalCount,
    });

    // Determine incentive amount for this specific joining
    let joiningIncentiveAmount = 0;
    if (incentiveResult.eligible) {
      const ratePerJoining =
        joining.joiningType === "International"
          ? incentiveResult.internationalRate
          : incentiveResult.domesticRate;
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
  if (!["International", "Domestic"].includes(joiningType)) {
    return res.status(400).json({
      success: false,
      message: "Joining type must be either 'International' or 'Domestic'",
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
  const joinings = await Joining.find({
    createdBy: req.employee._id,
  })
    .populate("company", "companyName")
    .populate("createdBy", "name")
    .sort({ createdAt: -1 });

  const totalJoinings = await Joining.countDocuments();

  return res.status(200).json({
    success: true,
    message: "Joinings fetched successfully",
    joinings,
    totalJoinings,
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

  // Validate joiningType if provided
  if (
    updateData.joiningType &&
    !["International", "Domestic"].includes(updateData.joiningType)
  ) {
    return res.status(400).json({
      success: false,
      message: "Joining type must be either 'International' or 'Domestic'",
    });
  }

  const joining = await Joining.findByIdAndUpdate(joiningId, updateData, {
    new: true,
    runValidators: true,
  }).populate("company", "companyName");

  if (!joining) {
    return res.status(404).json({
      success: false,
      message: "Joining not found",
    });
  }

  // Update incentives
  await updateJoiningIncentives(joining);

  // Emit WebSocket event for joining update
  emitFeedUpdate(joiningId, {
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

  // Count international and domestic joinings
  const internationalCount = joinings.filter(
    (j) => j.joiningType === "International"
  ).length;
  const domesticCount = joinings.filter(
    (j) => j.joiningType === "Domestic"
  ).length;

  // Calculate incentives
  const incentiveResult = calculateIncentives({
    domestic: domesticCount,
    international: internationalCount,
  });

  // Update incentives for all eligible joinings
  if (incentiveResult.eligible) {
    const updatePromises = joinings.map(async (joining) => {
      const ratePerJoining =
        joining.joiningType === "International"
          ? incentiveResult.internationalRate
          : incentiveResult.domesticRate;

      joining.incentives = {
        eligible: true,
        amount: ratePerJoining,
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
        total: internationalCount + domesticCount,
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

  // Calculate incentives based on all eligible joinings
  const incentiveResult = calculateIncentives({
    domestic: domesticCount,
    international: internationalCount,
  });

  // Update all joinings with appropriate incentive data
  const updatePromises = allJoinings.map(async (joining) => {
    if (isEligibleStatus(joining.status) && incentiveResult.eligible) {
      const ratePerJoining =
        joining.joiningType === "International"
          ? incentiveResult.internationalRate
          : incentiveResult.domesticRate;

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
        total: internationalCount + domesticCount,
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
