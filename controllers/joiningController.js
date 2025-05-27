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

  // Check if an ACTIVE joining with this contact number already exists
  // Only block if the status is "Joining Details Received"
  const existingActiveJoining = await Joining.findOne({
    contactNumber,
    company,
    process,
    status: "Joining Details Received",
  });

  if (existingActiveJoining) {
    return res.status(409).json({
      success: false,
      message:
        "An active joining record already exists for this candidate with the same company and process.",
      joiningId: existingActiveJoining._id,
    });
  }

  // Check if any joining (regardless of status) exists for same candidate, company, process
  // If it exists but is not in "Joining Details Received" status, we'll allow creating a new one
  // but we'll include the existing joining ID in the response for reference
  const existingAnyJoining = await Joining.findOne({
    contactNumber,
    company,
    process,
  });

  let previousJoiningId = null;
  if (existingAnyJoining) {
    previousJoiningId = existingAnyJoining._id;
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

  // Update the lineup status to "Joined"
  await Lineup.findByIdAndUpdate(lineup._id, {
    status: "Joined",
    remarks: `${remarks} - Candidate has joined on ${new Date(
      joiningDate
    ).toLocaleDateString()}`,
  });

  // Update candidate status
  await Candidate.findOneAndUpdate(
    { mobileNo: contactNumber },
    {
      callStatus: "Joined",
      $push: {
        callStatusHistory: {
          status: "Joined",
          date: Date.now(),
          employee: req.employee._id,
        },
        remarks: {
          remark: `Joined ${company} - ${process}`,
          date: Date.now(),
          employee: req.employee._id,
        },
      },
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
    message: previousJoiningId
      ? "Joining created successfully (Note: A previous inactive joining exists for this candidate)"
      : "Joining created successfully",
    joining,
    previousJoiningId,
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

  // Get current month's first and last day
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );

  // Filter joinings for current month for incentive calculation
  const currentMonthJoinings = joinings.filter(
    (joining) =>
      new Date(joining.createdAt) >= firstDayOfMonth &&
      new Date(joining.createdAt) <= lastDayOfMonth
  );

  // Count all joinings for current month
  const internationalCount = currentMonthJoinings.filter(
    (j) => j.joiningType === "International"
  ).length;
  const domesticCount = currentMonthJoinings.filter(
    (j) => j.joiningType === "Domestic"
  ).length;
  const midLateralCount = currentMonthJoinings.filter(
    (j) => j.joiningType === "Mid-Lateral"
  ).length;

  // Calculate incentives for current month
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
      period: {
        startDate: firstDayOfMonth.toISOString().split("T")[0],
        endDate: lastDayOfMonth.toISOString().split("T")[0],
        label: "Current Month",
      },
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

  // Check if updating to a different contact number
  if (
    updateData.contactNumber &&
    updateData.contactNumber !== existingJoining.contactNumber
  ) {
    // Only block if there's an active joining with "Joining Details Received" status
    const duplicateActiveJoining = await Joining.findOne({
      contactNumber: updateData.contactNumber,
      company: updateData.company || existingJoining.company,
      process: updateData.process || existingJoining.process,
      status: "Joining Details Received",
      _id: { $ne: joiningId },
    });

    if (duplicateActiveJoining) {
      return res.status(409).json({
        success: false,
        message:
          "Another active joining record already exists for this candidate with the same company and process.",
        joiningId: duplicateActiveJoining._id,
      });
    }

    // Check if any joining exists (not necessarily active)
    const duplicateAnyJoining = await Joining.findOne({
      contactNumber: updateData.contactNumber,
      company: updateData.company || existingJoining.company,
      process: updateData.process || existingJoining.process,
      _id: { $ne: joiningId },
    });

    if (duplicateAnyJoining) {
      // Not blocking, but adding info to the response
      updateData.previousJoiningExists = true;
      updateData.previousJoiningId = duplicateAnyJoining._id;
      updateData.previousJoiningStatus = duplicateAnyJoining.status;
    }
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
    // Find the related lineup
    const lineup = await Lineup.findOne({
      contactNumber: joining.contactNumber,
      company: joining.company,
      process: joining.process,
    });

    if (lineup) {
      // Lock the candidate for the employee who created the lineup
      await lockCandidate(joining.contactNumber, lineup.createdBy, "joining");

      // Update the lineup status to "Joined"
      await Lineup.findByIdAndUpdate(lineup._id, {
        status: "Joined",
        remarks: `${
          lineup.remarks || ""
        } - Joining status updated to Joining Details Received`,
      });
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

  // Check if status is changed from "Joining Details Received" to another status
  if (
    updateData.status &&
    updateData.status !== "Joining Details Received" &&
    existingJoining.status === "Joining Details Received"
  ) {
    // The joining status is being changed away from "Joining Details Received"
    // Check if there are other active joinings for this candidate
    const otherActiveJoinings = await Joining.countDocuments({
      contactNumber: joining.contactNumber,
      status: "Joining Details Received",
      _id: { $ne: joiningId },
    });

    // If no other active joinings, unlock the candidate's 90-day lock
    if (otherActiveJoinings === 0) {
      const candidate = await Candidate.findOne({
        mobileNo: joining.contactNumber,
      });

      if (candidate) {
        // Only unlock if the lock was specifically for joining (90 days)
        // For lineup or walkin locks, we should keep them locked
        if (
          candidate.isLocked &&
          candidate.registrationLockExpiry &&
          // Calculate approximate lock time - if it's close to 90 days, it was likely a joining lock
          (candidate.registrationLockExpiry - new Date()) /
            (1000 * 60 * 60 * 24) >
            LINEUP_LOCK_DAYS
        ) {
          // Instead of unlocking, let's set the lock to lineup lock days if candidate is still in lineup/walkin status
          if (
            candidate.callStatus === "Lineup" ||
            candidate.callStatus === "Walkin at Infidea"
          ) {
            const newLockExpiry = new Date();
            newLockExpiry.setDate(newLockExpiry.getDate() + LINEUP_LOCK_DAYS);

            await Candidate.findByIdAndUpdate(candidate._id, {
              registrationLockExpiry: newLockExpiry,
            });
          } else {
            // For other statuses, unlock the candidate
            await Candidate.findByIdAndUpdate(candidate._id, {
              isLocked: false,
              registrationLockExpiry: null,
            });
          }
        }
      }
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

// Month-wise summary for a financial year (per employee)
const getFinancialYearSummary = handleAsync(async (req, res) => {
  const employeeId = req.employee._id;
  let { startDate, endDate } = req.query;

  // Default to Indian FY if not provided
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  if (!startDate || !endDate) {
    // If before April, FY is previous year to current year
    if (currentMonth < 3) {
      startDate = `${currentYear - 1}-04-01`;
      endDate = `${currentYear}-03-31`;
    } else {
      startDate = `${currentYear}-04-01`;
      endDate = `${currentYear + 1}-03-31`;
    }
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // include full end day

  // Generate month ranges between start and end
  const months = [];
  let temp = new Date(start);
  while (temp <= end) {
    const monthStart = new Date(temp.getFullYear(), temp.getMonth(), 1);
    const monthEnd = new Date(
      temp.getFullYear(),
      temp.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    if (monthEnd > end) monthEnd.setTime(end.getTime());
    months.push({
      month: monthStart.toLocaleString("default", { month: "long" }),
      year: monthStart.getFullYear(),
      start: new Date(monthStart),
      end: new Date(monthEnd),
    });
    temp.setMonth(temp.getMonth() + 1);
  }

  // Fetch all joinings for the employee in the FY
  const joinings = await Joining.find({
    createdBy: employeeId,
    createdAt: { $gte: start, $lte: end },
  }).lean();

  // Prepare month-wise summary
  const summary = months.map(({ month, year, start, end }) => {
    const monthJoinings = joinings.filter((j) => {
      const created = new Date(j.createdAt);
      return created >= start && created <= end;
    });
    return {
      month,
      year,
      totalJoinings: monthJoinings.length,
      totalIncentive: monthJoinings.reduce(
        (sum, j) => sum + (j.incentives?.amount || 0),
        0
      ),
    };
  });

  // Totals
  const totalJoinings = summary.reduce((sum, m) => sum + m.totalJoinings, 0);
  const totalIncentive = summary.reduce((sum, m) => sum + m.totalIncentive, 0);

  return res.status(200).json({
    success: true,
    message: "Financial year summary fetched successfully",
    data: summary,
    totals: { totalJoinings, totalIncentive },
    period: { startDate, endDate },
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
  getFinancialYearSummary,
};
