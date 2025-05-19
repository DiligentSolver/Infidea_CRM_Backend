const Candidate = require("../models/candidateModel");
const Employee = require("../models/employeeModel");
const { handleAsync } = require("../utils/attemptAndOtp");
const {
  createCandidateMarkNotification,
  createDuplicityCheckNotification,
} = require("./notificationController");
const {
  checkCandidateLock,
  LINEUP_LOCK_DAYS,
} = require("../utils/candidateLockManager");
const BulkUploadCount = require("../models/bulkUploadCountModel");

// Check duplicity by mobile number
exports.checkDuplicity = handleAsync(async (req, res, next) => {
  const { mobileNo } = req.params;

  const candidate = await Candidate.findOne({ mobileNo }).populate(
    "lastRegisteredBy",
    "name"
  );

  if (!candidate) {
    return res.status(200).json({
      status: "success",
      isDuplicate: false,
      message: "No duplicate found",
    });
  }

  let remainingDays = 0;
  let remainingTime = null;

  if (candidate.isLocked && candidate.registrationLockExpiry > new Date()) {
    const diffMs = candidate.registrationLockExpiry - new Date();
    remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      remainingTime = `${hours}h ${minutes}m`;
    }
  }

  // Notify the original employee who registered this candidate
  // only if it's a different employee checking
  if (
    candidate.lastRegisteredBy &&
    candidate.lastRegisteredBy._id.toString() !== req.employee._id.toString()
  ) {
    try {
      const checkingEmployee = await Employee.findById(req.employee._id);

      await createDuplicityCheckNotification(
        candidate,
        checkingEmployee,
        candidate.lastRegisteredBy._id,
        req.io
      );
    } catch (error) {
      console.error("Error sending notification:", error);
      // Continue with the response even if notification fails
    }
  }

  return res.status(200).json({
    status: "success",
    isDuplicate: true,
    registeredBy: candidate.lastRegisteredBy?.name?.en || "Unknown",
    remainingDays,
    remainingTime,
    isLocked:
      candidate.isLocked && candidate.registrationLockExpiry > new Date(),
  });
});

// Mark candidate for current employee
exports.checkDulicateInputField = handleAsync(async (req, res, next) => {
  const { mobileNo } = req.params;

  const candidate = await Candidate.findOne({ mobileNo })
    .populate("lastRegisteredBy", "name")
    .populate("registrationHistory.registeredBy", "name");

  if (!candidate) {
    return res.status(404).json({
      status: "fail",
      message: "Candidate not found",
    });
  }

  // Check if current employee is the last registered by
  const isLastRegisteredBy =
    candidate.lastRegisteredBy &&
    candidate.lastRegisteredBy._id.toString() === req.employee._id.toString();

  // Check if current employee already exists in registration history
  let alreadyInHistory = false;
  if (
    candidate.registrationHistory &&
    candidate.registrationHistory.length > 0
  ) {
    for (const entry of candidate.registrationHistory) {
      if (
        entry.registeredBy &&
        entry.registeredBy._id &&
        entry.registeredBy._id.toString() === req.employee._id.toString()
      ) {
        alreadyInHistory = true;
        break;
      }
    }
  }

  if (alreadyInHistory || isLastRegisteredBy) {
    return res.status(400).json({
      status: "fail",
      message:
        "You have already registered this candidate previously. You cannot mark again.",
    });
  }

  if (candidate.isLocked && candidate.registrationLockExpiry > new Date()) {
    const diffMs = candidate.registrationLockExpiry - new Date();
    const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    let remainingTime = null;
    if (diffMs < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      remainingTime = `${hours}h ${minutes}m`;
    }

    // Store the previous owner's ID before we change it
    const previousOwnerId = candidate.lastRegisteredBy
      ? candidate.lastRegisteredBy._id
      : null;

    // Send notification to the previous owner
    if (previousOwnerId) {
      try {
        const markingEmployee = await Employee.findById(req.employee._id);

        await createDuplicityCheckNotification(
          candidate,
          markingEmployee,
          previousOwnerId,
          req.io
        );
      } catch (error) {
        console.error("Error sending notification:", error);
        // Continue with the response even if notification fails
      }
    }

    return res.status(400).json({
      status: "fail",
      message: "Candidate is still locked",
      lockedBy: candidate.lastRegisteredBy.name.en,
      remainingDays,
      ...(remainingTime && { remainingTime }),
    });
  }

  return res.status(200).json({
    status: "success",
    message: "Candidate is not locked",
    candidate,
  });
});

// Mark candidate for current employee
exports.markCandidate = handleAsync(async (req, res, next) => {
  const { mobileNo } = req.params;

  const candidate = await Candidate.findOne({ mobileNo })
    .populate("lastRegisteredBy", "name")
    .populate("registrationHistory.registeredBy", "name");

  if (!candidate) {
    return res.status(404).json({
      status: "fail",
      message: "Candidate not found",
    });
  }

  if (candidate.isLocked && candidate.registrationLockExpiry > new Date()) {
    const diffMs = candidate.registrationLockExpiry - new Date();
    const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    let remainingTime = null;
    if (diffMs < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      remainingTime = `${hours}h ${minutes}m`;
    }
    return res.status(400).json({
      status: "fail",
      message: "Candidate is still locked",
      lockedBy: candidate.lastRegisteredBy.name.en,
      remainingDays,
      ...(remainingTime && { remainingTime }),
    });
  }

  // Check if current employee is the last registered by
  const isLastRegisteredBy =
    candidate.lastRegisteredBy &&
    candidate.lastRegisteredBy._id.toString() === req.employee._id.toString();

  // Check if current employee already exists in registration history
  let alreadyInHistory = false;
  if (
    candidate.registrationHistory &&
    candidate.registrationHistory.length > 0
  ) {
    for (const entry of candidate.registrationHistory) {
      if (
        entry.registeredBy &&
        entry.registeredBy._id &&
        entry.registeredBy._id.toString() === req.employee._id.toString()
      ) {
        alreadyInHistory = true;
        break;
      }
    }
  }

  if (alreadyInHistory || isLastRegisteredBy) {
    return res.status(400).json({
      status: "fail",
      message:
        "You have already registered this candidate previously. You cannot mark again.",
    });
  }

  // Store the previous owner's ID before we change it
  const previousOwnerId = candidate.lastRegisteredBy
    ? candidate.lastRegisteredBy._id
    : null;

  // Update registration history
  candidate.registrationHistory.push({
    registeredBy: req.employee._id,
    registrationDate: new Date(),
    status: "Active",
  });

  // Mark previous history entries as expired
  candidate.registrationHistory.forEach((entry) => {
    if (entry.status === "Active") {
      entry.status = "Expired";
    }
  });

  // Update the lastRegisteredBy to the current employee but DON'T lock the candidate on marking
  candidate.lastRegisteredBy = req.employee._id;

  // Important: When marking a candidate, we DO NOT lock them regardless of status
  candidate.isLocked = false;
  candidate.registrationLockExpiry = null;

  await candidate.save();

  // Send notification to the previous owner
  if (previousOwnerId) {
    try {
      const markingEmployee = await Employee.findById(req.employee._id);

      await createCandidateMarkNotification(
        candidate,
        markingEmployee,
        previousOwnerId,
        req.io
      );
    } catch (error) {
      console.error("Error sending notification:", error);
      // Continue with the response even if notification fails
    }
  }

  res.status(200).json({
    status: "success",
    message: "Candidate marked successfully",
    candidate,
  });
});

// Create a new candidate record
exports.createCandidate = handleAsync(async (req, res, next) => {
  const {
    name,
    mobileNo,
    whatsappNo,
    source,
    gender,
    experience,
    qualification,
    state,
    city,
    salaryExpectation,
    communication,
    noticePeriod,
    shift,
    relocation,
    companyProfile,
    callStatus,
    callDuration,
    callSummary,
    locality,
    lineupCompany,
    customLineupCompany,
    lineupProcess,
    customLineupProcess,
    lineupDate,
    interviewDate,
    walkinDate,
    remarks,
  } = req.body;

  // Check if candidate with same mobile number exists
  const existingCandidate = await Candidate.findOne({ mobileNo });

  if (existingCandidate) {
    return res.status(409).json({
      status: "fail",
      message: "Candidate with this mobile number already exists",
    });
  }

  // Initialize callStatusHistory
  const callStatusHistory = [];
  callStatusHistory.push({
    status: callStatus || "New",
    date: Date.now(),
    employee: req.employee._id,
  });

  // Initialize callDurationHistory if provided
  const callDurationHistory = [];
  if (callDuration) {
    callDurationHistory.push({
      duration: callDuration,
      date: Date.now(),
      employee: req.employee._id,
      summary: callSummary,
    });
  }

  // Initialize remarks if provided
  const remarksHistory = [];
  if (remarks) {
    remarksHistory.push({
      remark: remarks,
      date: Date.now(),
      employee: req.employee._id,
    });
  }

  // Initialize lineup and walkin remarks history
  const lineupRemarksHistory = [];
  const walkinRemarksHistory = [];

  // Check if the status is a lockable status (lineup or walkin)
  const hasLockableStatus =
    callStatus &&
    (callStatus.toLowerCase() === "lineup" ||
      callStatus.toLowerCase() === "walkin at infidea");

  // Set registration lock expiry date if lockable status
  let registrationLockExpiry = null;
  let isLocked = false;

  if (hasLockableStatus) {
    registrationLockExpiry = new Date();
    registrationLockExpiry.setDate(
      registrationLockExpiry.getDate() + LINEUP_LOCK_DAYS
    );
    isLocked = true;
  }

  // Initialize registration history
  const registrationHistory = [
    {
      registeredBy: req.employee._id,
      registrationDate: new Date(),
      status: "Active",
    },
  ];

  // Add lineup remarks history if status is lineup
  if (callStatus && callStatus.toLowerCase() === "lineup") {
    lineupRemarksHistory.push({
      remark: remarks || "Initial lineup created",
      date: new Date(),
      employee: req.employee._id,
      company: lineupCompany || customLineupCompany,
      process: lineupProcess || customLineupProcess,
      lineupDate: new Date(lineupDate),
      interviewDate: new Date(interviewDate),
    });
  }

  // Add walkin remarks history if status is walkin
  if (callStatus && callStatus.toLowerCase() === "walkin at infidea") {
    walkinRemarksHistory.push({
      remark: remarks || "Initial walkin created",
      date: new Date(),
      employee: req.employee._id,
      walkinDate: new Date(walkinDate),
    });
  }

  // Create candidate record
  const candidate = await Candidate.create({
    name,
    mobileNo,
    whatsappNo,
    source,
    gender,
    experience,
    qualification,
    state,
    city,
    salaryExpectation,
    communication,
    noticePeriod,
    shift,
    relocation,
    companyProfile,
    callStatus: callStatus || "New",
    createdBy: req.employee._id,
    lastRegisteredBy: req.employee._id,
    callStatusHistory,
    callDurationHistory,
    remarks: remarksHistory,
    locality,
    lineupCompany,
    customLineupCompany,
    lineupProcess,
    customLineupProcess,
    lineupDate,
    interviewDate,
    walkinDate,
    registrationHistory,
    registrationLockExpiry,
    isLocked,
    lineupRemarksHistory,
    walkinRemarksHistory,
  });

  // Check if callStatus is lineup and create a lineup record
  if (callStatus && callStatus.toLowerCase() === "lineup") {
    const Lineup = require("../models/lineupModel");

    // Create the lineup record
    await Lineup.create({
      name: name,
      contactNumber: mobileNo,
      company: lineupCompany || customLineupCompany,
      process: lineupProcess || customLineupProcess,
      lineupDate: lineupDate,
      interviewDate: interviewDate,
      status: "Scheduled",
      createdBy: req.employee._id,
      remarks: remarks,
    });
  }

  // Check if callStatus is "Walkin at Infidea" and create a walkin record
  if (callStatus && callStatus.toLowerCase() === "walkin at infidea") {
    const Walkin = require("../models/walkinModel");

    // Create the walkin record
    await Walkin.create({
      candidateName: name,
      contactNumber: mobileNo,
      walkinDate: walkinDate,
      remarks: remarks,
      status: "Walkin at Infidea",
      createdBy: req.employee._id,
    });
  }

  res.status(201).json({
    status: "success",
    data: {
      candidate,
    },
  });
});

// Get all candidates
exports.getAllCandidates = handleAsync(async (req, res, next) => {
  const candidates = await Candidate.find({
    $or: [
      { lastRegisteredBy: req.employee._id },
      { createdBy: req.employee._id },
      {
        registrationHistory: {
          $elemMatch: { registeredBy: req.employee._id },
        },
      },
    ],
  })
    .populate("lastRegisteredBy", "name")
    .sort({ createdAt: -1 });

  const employee = await Employee.find();

  // Add registration status info for each candidate
  const candidatesWithStatus = candidates.map((candidate) => {
    const isLockedByMe =
      candidate.isLocked &&
      candidate.lastRegisteredBy &&
      candidate.lastRegisteredBy._id &&
      candidate.lastRegisteredBy._id.toString() === req.employee._id.toString();

    const isLastRegisteredByMe =
      candidate.lastRegisteredBy &&
      candidate.lastRegisteredBy._id &&
      candidate.lastRegisteredBy._id.toString() === req.employee._id.toString();

    const lastRegisteredByName = employee.find(
      (emp) => emp._id.toString() === candidate.lastRegisteredBy._id.toString()
    ).name.en;

    let remainingDays = 0;

    let remainingTime = null;

    if (candidate.isLocked && candidate.registrationLockExpiry > new Date()) {
      const diffMs = candidate.registrationLockExpiry - new Date();
      remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        remainingTime = `${hours}h ${minutes}m`;
      }
    }

    // Filter call duration history to only include the current employee's entries
    let employeeCallHistory = [];
    if (
      candidate.callDurationHistory &&
      candidate.callDurationHistory.length > 0
    ) {
      employeeCallHistory = candidate.callDurationHistory.filter(
        (record) =>
          record.employee &&
          record.employee.toString() === req.employee._id.toString()
      );
    }

    let employeeRemarksHistory = [];
    if (candidate.remarks && candidate.remarks.length > 0) {
      employeeRemarksHistory = candidate.remarks.filter(
        (remark) =>
          remark.employee &&
          remark.employee.toString() === req.employee._id.toString()
      );
    }

    return {
      ...candidate._doc,
      isLockedByMe,
      isLastRegisteredByMe,
      lastRegisteredByName,
      remainingDays,
      remainingTime,
      employeeCallHistory,
      employeeRemarksHistory,
    };
  });

  res.status(200).json({
    status: "success",
    results: candidatesWithStatus.length,
    candidates: candidatesWithStatus,
  });
});

// Get a single candidate
exports.getCandidate = handleAsync(async (req, res, next) => {
  const candidate = await Candidate.findById(req.params.id).populate(
    "createdBy",
    "name"
  );

  if (!candidate) {
    return res
      .status(404)
      .json({ status: "fail", message: "No candidate found with that ID" });
  }

  res.status(200).json({
    status: "success",
    data: {
      candidate,
    },
  });
});

// Get candidate call duration history
exports.getCandidateCallHistory = handleAsync(async (req, res, next) => {
  const candidate = await Candidate.findById(req.params.id).populate({
    path: "callDurationHistory.employee",
    select: "name",
  });

  if (!candidate) {
    return res
      .status(404)
      .json({ status: "fail", message: "No candidate found with that ID" });
  }

  // Calculate total call duration
  let totalDuration = 0;
  if (
    candidate.callDurationHistory &&
    candidate.callDurationHistory.length > 0
  ) {
    totalDuration = candidate.callDurationHistory.reduce((total, record) => {
      return total + parseInt(record.duration || "0");
    }, 0);
  }

  res.status(200).json({
    status: "success",
    data: {
      candidateName: candidate.name,
      candidateMobile: candidate.mobileNo,
      totalCallDuration: totalDuration.toString(),
      callHistory: candidate.callDurationHistory,
    },
  });
});

// Update candidate
exports.updateCandidate = handleAsync(async (req, res, next) => {
  // First fetch the existing candidate to compare call duration
  const existingCandidate = await Candidate.findById(req.params.candidateId);

  const isLocked =
    existingCandidate.isLocked &&
    existingCandidate.registrationLockExpiry &&
    existingCandidate.registrationLockExpiry > new Date();

  const isUnderMe =
    existingCandidate.lastRegisteredBy &&
    existingCandidate.lastRegisteredBy._id &&
    existingCandidate.lastRegisteredBy._id.toString() ===
      req.employee._id.toString();

  if (isLocked && !isUnderMe) {
    return res.status(400).json({
      status: "fail",
      message: "Candidate is locked and cannot be updated by another employee.",
    });
  }

  if (!existingCandidate) {
    return res
      .status(404)
      .json({ status: "fail", message: "No candidate found with that ID" });
  }

  // Check if call duration is being updated
  if (req.body.callDuration !== undefined) {
    const existingDuration = parseInt(existingCandidate.callDuration || "0");
    const newDuration = parseInt(req.body.callDuration || "0");

    // Only add to history if there's an actual change in duration or if there's a new summary
    const shouldAddToHistory =
      newDuration !== existingDuration ||
      (req.body.callSummary && req.body.callSummary.trim() !== "");

    if (shouldAddToHistory) {
      // Push to call duration history array
      existingCandidate.callDurationHistory =
        existingCandidate.callDurationHistory || [];
      existingCandidate.callDurationHistory.push({
        duration: req.body.callDuration,
        employee: req.employee._id,
        date: new Date(),
        summary: req.body.callSummary || "Call update",
      });
    }
  }

  // Check if call status is being updated
  if (
    req.body.callStatus &&
    (!existingCandidate.callStatus ||
      req.body.callStatus !== existingCandidate.callStatus)
  ) {
    // Initialize call status history array if it doesn't exist
    existingCandidate.callStatusHistory =
      existingCandidate.callStatusHistory || [];

    // Add new call status to history
    existingCandidate.callStatusHistory.push({
      status: req.body.callStatus,
      date: new Date(),
      employee: req.employee._id,
    });
  }

  // Check if lineup details are being updated
  if (
    req.body.callStatus &&
    req.body.callStatus.toLowerCase() === "lineup" &&
    (req.body.lineupCompany ||
      req.body.customLineupCompany ||
      req.body.lineupProcess ||
      req.body.customLineupProcess ||
      req.body.lineupDate ||
      req.body.interviewDate ||
      req.body.remarks)
  ) {
    // Initialize lineup remarks history array if it doesn't exist
    existingCandidate.lineupRemarksHistory =
      existingCandidate.lineupRemarksHistory || [];

    // Add new lineup remarks to history
    existingCandidate.lineupRemarksHistory.push({
      remark: req.body.remarks || "Lineup details updated",
      date: new Date(),
      employee: req.employee._id,
      company: req.body.lineupCompany || req.body.customLineupCompany,
      process: req.body.lineupProcess || req.body.customLineupProcess,
      lineupDate: new Date(req.body.lineupDate),
      interviewDate: new Date(req.body.interviewDate),
    });
  }

  // Check if walkin details are being updated
  if (
    req.body.callStatus &&
    req.body.callStatus.toLowerCase() === "walkin at infidea" &&
    (req.body.walkinDate || req.body.remarks)
  ) {
    // Initialize walkin remarks history array if it doesn't exist
    existingCandidate.walkinRemarksHistory =
      existingCandidate.walkinRemarksHistory || [];

    // Add new walkin remarks to history
    existingCandidate.walkinRemarksHistory.push({
      remark: req.body.remarks || "Walkin details updated",
      date: new Date(),
      employee: req.employee._id,
      walkinDate: new Date(req.body.walkinDate),
    });
  }

  // Check if the candidate needs to be locked (only for first lineup/walkin and only if not already locked)
  const isMovingToLockableStatus =
    req.body.callStatus &&
    (req.body.callStatus.toLowerCase() === "lineup" ||
      req.body.callStatus.toLowerCase() === "walkin at infidea");

  const currentStatus = existingCandidate.callStatus
    ? existingCandidate.callStatus.toLowerCase()
    : "";
  const wasAlreadyLockableStatus =
    currentStatus === "lineup" || currentStatus === "walkin at infidea";

  // Check if the current employee is not the last registered and not in registration history
  const isLastRegisteredByMe =
    existingCandidate.lastRegisteredBy &&
    existingCandidate.lastRegisteredBy.toString() ===
      req.employee._id.toString();

  let alreadyInHistory = false;
  if (
    existingCandidate.registrationHistory &&
    existingCandidate.registrationHistory.length > 0
  ) {
    alreadyInHistory = existingCandidate.registrationHistory.some(
      (entry) =>
        entry.registeredBy &&
        entry.registeredBy.toString() === req.employee._id.toString()
    );
  }

  // When updating, mark the candidate for the current employee if they are not already registered
  if (!isLastRegisteredByMe && !alreadyInHistory) {
    // Store the previous owner's ID before we change it
    const previousOwnerId = existingCandidate.lastRegisteredBy
      ? existingCandidate.lastRegisteredBy
      : null;

    // Update registration history
    existingCandidate.registrationHistory =
      existingCandidate.registrationHistory || [];
    existingCandidate.registrationHistory.push({
      registeredBy: req.employee._id,
      registrationDate: new Date(),
      status: "Active",
    });

    // Mark previous history entries as expired
    existingCandidate.registrationHistory.forEach((entry, index) => {
      if (
        index !== existingCandidate.registrationHistory.length - 1 &&
        entry.status === "Active"
      ) {
        entry.status = "Expired";
      }
    });

    req.body.lastRegisteredBy = req.employee._id;
    req.body.registrationHistory = existingCandidate.registrationHistory;

    // Send notification to the previous owner
    if (previousOwnerId) {
      try {
        const markingEmployee = await Employee.findById(req.employee._id);

        await createCandidateMarkNotification(
          existingCandidate,
          markingEmployee,
          previousOwnerId,
          req.io
        );
      } catch (error) {
        console.error("Error sending notification:", error);
        // Continue with the response even if notification fails
      }
    }
  }

  // Check if the candidate is not already locked and either:
  // 1. The candidate is being moved to a lockable status from a non-lockable status, or
  // 2. This is a re-lock after an expiry of a previous lock
  if (
    isMovingToLockableStatus &&
    (!existingCandidate.isLocked ||
      existingCandidate.registrationLockExpiry < new Date()) &&
    (!wasAlreadyLockableStatus ||
      existingCandidate.registrationLockExpiry < new Date())
  ) {
    // Set registration lock for 30 days
    const registrationLockExpiry = new Date();
    registrationLockExpiry.setDate(registrationLockExpiry.getDate() + 30);

    req.body.registrationLockExpiry = registrationLockExpiry;
    req.body.isLocked = true;
  }

  // Merge the candidate data with the request body
  const updatedData = { ...req.body };

  // Update with the new history arrays
  if (existingCandidate.callDurationHistory) {
    updatedData.callDurationHistory = existingCandidate.callDurationHistory;
  }

  if (existingCandidate.callStatusHistory) {
    updatedData.callStatusHistory = existingCandidate.callStatusHistory;
  }

  if (existingCandidate.registrationHistory) {
    updatedData.registrationHistory = existingCandidate.registrationHistory;
  }

  if (existingCandidate.lineupRemarksHistory) {
    updatedData.lineupRemarksHistory = existingCandidate.lineupRemarksHistory;
  }

  if (existingCandidate.walkinRemarksHistory) {
    updatedData.walkinRemarksHistory = existingCandidate.walkinRemarksHistory;
  }

  // Update the candidate
  const candidate = await Candidate.findByIdAndUpdate(
    req.params.candidateId,
    updatedData,
    {
      new: true,
      runValidators: true,
    }
  );

  // Check if callStatus is lineup and create or update a lineup record
  if (req.body.callStatus && req.body.callStatus.toLowerCase() === "lineup") {
    const Lineup = require("../models/lineupModel");

    // Find a lineup record for this candidate and creator
    const existingLineup = await Lineup.findOne({
      contactNumber: candidate.mobileNo,
      company: req.body.lineupCompany || req.body.customLineupCompany,
      process: req.body.lineupProcess || req.body.customLineupProcess,
      createdBy: req.employee._id,
      lineupRemarks: req.body.lineupRemarks,
    });

    const newLineupData = {
      name: candidate.name,
      contactNumber: candidate.mobileNo,
      company: req.body.lineupCompany || req.body.customLineupCompany,
      process: req.body.lineupProcess || req.body.customLineupProcess,
      lineupDate: req.body.lineupDate,
      interviewDate: req.body.interviewDate,
      status: "Scheduled",
      createdBy: req.employee._id,
      lineupRemarks: req.body.lineupRemarks,
    };

    if (existingLineup) {
      // Check if any field is different
      let isDifferent = false;
      for (const key in newLineupData) {
        if (
          existingLineup[key] &&
          newLineupData[key] &&
          existingLineup[key].toString() !== newLineupData[key].toString()
        ) {
          isDifferent = true;
          break;
        }
      }

      if (isDifferent) {
        // Update the existing lineup record
        await Lineup.findByIdAndUpdate(existingLineup._id, newLineupData, {
          new: true,
          runValidators: true,
        });
      }
      // If not different, do nothing
    } else {
      // Create the lineup record
      await Lineup.create(newLineupData);
    }
  }

  // Check if callStatus is "Walkin at Infidea"
  if (
    req.body.callStatus &&
    req.body.callStatus.toLowerCase() === "walkin at infidea"
  ) {
    const Walkin = require("../models/walkinModel");

    // Check if a walkin record already exists for this candidate
    const existingWalkin = await Walkin.findOne({
      contactNumber: req.body.mobileNo || candidate.mobileNo,
      walkinDate: req.body.walkinDate,
      walkinRemarks: req.body.walkinRemarks,
    });

    // Only create a new walkin record if none exists
    if (!existingWalkin) {
      // Create the walkin record
      await Walkin.create({
        candidateName: req.body.name || candidate.name,
        contactNumber: req.body.mobileNo || candidate.mobileNo,
        walkinDate: req.body.walkinDate,
        walkinRemarks: req.body.walkinRemarks,
        status: "Walkin at Infidea",
        createdBy: req.employee._id,
      });
    }
  }

  res.status(200).json({
    status: "success",
    message: "Candidate Updated Successfully",
    candidate,
  });
});

// Delete candidate
exports.deleteCandidate = handleAsync(async (req, res, next) => {
  const candidate = await Candidate.findByIdAndDelete(req.params.id);

  if (!candidate) {
    return res
      .status(404)
      .json({ status: "fail", message: "No candidate found with that ID" });
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Bulk upload candidates from Excel data
exports.bulkUploadCandidates = handleAsync(async (req, res, next) => {
  const { candidates } = req.body;

  if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({
      status: "fail",
      message: "Please provide a valid array of candidates",
    });
  }

  // Get today's date with time set to start of day
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check current upload count for this employee today
  let uploadCount = await BulkUploadCount.findOne({
    employee: req.employee._id,
    date: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  if (!uploadCount) {
    // Create new count record if none exists
    uploadCount = new BulkUploadCount({
      employee: req.employee._id,
      date: today,
      count: 0,
    });
  }

  // Calculate how many more candidates can be uploaded today
  const remainingLimit = 50 - uploadCount.count;

  if (remainingLimit <= 0) {
    return res.status(400).json({
      status: "fail",
      message:
        "Daily upload limit of 50 candidates has been reached. Please try again tomorrow.",
    });
  }

  // Limit the number of candidates to process
  const candidatesToProcess = candidates.slice(0, remainingLimit);

  const results = {
    total: candidatesToProcess.length,
    limited: candidates.length > remainingLimit,
    remainingToday: remainingLimit,
    successful: 0,
    failed: 0,
    details: [],
  };

  // Process each candidate
  for (const candidate of candidatesToProcess) {
    let existingCandidate = null;
    try {
      // Validate required fields
      if (!candidate.name || !candidate.mobileNo) {
        results.failed++;
        results.details.push({
          mobileNo: candidate.mobileNo || "Unknown",
          name: candidate.name || "Unknown",
          status: "Failed",
          reason: "Missing required fields (name or mobile number)",
        });
        continue;
      }

      // Check if candidate with same mobile number exists
      existingCandidate = await Candidate.findOne({
        mobileNo: candidate.mobileNo,
      }).populate("lastRegisteredBy", "name");

      if (existingCandidate) {
        // Skip existing candidates - don't mark them
        results.failed++;
        results.details.push({
          mobileNo: candidate.mobileNo,
          name: candidate.name,
          status: "Failed",
          reason: "Candidate with this mobile number already exists",
        });
        continue;
      } else {
        // Create a new candidate record

        // Prepare fields
        const callStatus = candidate.callStatus || "New";

        // Check if the status is a lockable status (lineup or walkin)
        const hasLockableStatus =
          callStatus &&
          (callStatus.toLowerCase() === "lineup" ||
            callStatus.toLowerCase() === "walkin at infidea");

        // Set registration lock expiry date if lockable status
        let registrationLockExpiry = null;
        let isLocked = false;

        if (hasLockableStatus) {
          registrationLockExpiry = new Date();
          registrationLockExpiry.setDate(
            registrationLockExpiry.getDate() + LINEUP_LOCK_DAYS
          );
          isLocked = true;
        }

        // Initialize call status history
        const callStatusHistory = [
          {
            status: callStatus,
            date: Date.now(),
            employee: req.employee._id,
          },
        ];

        // Initialize registration history
        const registrationHistory = [
          {
            registeredBy: req.employee._id,
            registrationDate: new Date(),
            status: "Active",
          },
        ];

        // Create the new candidate
        const newCandidate = await Candidate.create({
          name: candidate.name,
          mobileNo: candidate.mobileNo,
          whatsappNo: candidate.whatsappNo || candidate.mobileNo,
          source: candidate.source || "Excel Import",
          gender: candidate.gender || "-",
          experience: candidate.experience || "-",
          qualification: candidate.qualification || "-",
          state: candidate.state || "-",
          city: candidate.city || "-",
          salaryExpectation: candidate.salaryExpectation || "-",
          communication: candidate.communication || "-",
          noticePeriod: candidate.noticePeriod || "-",
          shift: candidate.shift || "-",
          relocation: candidate.relocation || "-",
          companyProfile: candidate.companyProfile || "-",
          callStatus: callStatus,
          callStatusHistory: callStatusHistory,
          createdBy: req.employee._id,
          lastRegisteredBy: req.employee._id,
          registrationHistory: registrationHistory,
          registrationLockExpiry: registrationLockExpiry,
          isLocked: isLocked,
          callDurationHistory: [
            {
              duration: "0",
              employee: req.employee._id,
              date: Date.now(),
              summary: "Imported from Excel",
            },
          ],
          remarks: [
            {
              remark: "Created via Excel import",
              date: Date.now(),
              employee: req.employee._id,
            },
          ],
        });

        // Check if callStatus is lineup and create a lineup record
        if (callStatus && callStatus.toLowerCase() === "lineup") {
          const Lineup = require("../models/lineupModel");

          // Create the lineup record
          await Lineup.create({
            name: candidate.name,
            contactNumber: candidate.mobileNo,
            company:
              candidate.lineupCompany ||
              candidate.customLineupCompany ||
              "Not Specified",
            process:
              candidate.lineupProcess ||
              candidate.customLineupProcess ||
              "Not Specified",
            lineupDate: candidate.lineupDate,
            interviewDate: candidate.interviewDate,
            status: "Scheduled",
            createdBy: req.employee._id,
            remarks: "Created during bulk upload",
          });
        }

        // Check if callStatus is "Walkin at Infidea" and create a walkin record
        if (callStatus && callStatus.toLowerCase() === "walkin at infidea") {
          const Walkin = require("../models/walkinModel");

          // Create the walkin record
          await Walkin.create({
            candidateName: candidate.name,
            contactNumber: candidate.mobileNo,
            walkinDate: candidate.walkinDate,
            remarks: "Created during bulk upload",
            status: "Walkin at Infidea",
            createdBy: req.employee._id,
          });
        }

        results.successful++;
        results.details.push({
          mobileNo: candidate.mobileNo,
          name: candidate.name,
          status: "Created",
          id: newCandidate._id,
        });

        // Increment the count for successfully created candidates
        uploadCount.count++;
      }
    } catch (error) {
      console.error("Error processing candidate:", error);
      results.failed++;
      results.details.push({
        mobileNo: candidate.mobileNo || "Unknown",
        name: candidate.name || "Unknown",
        status: "Failed",
        reason: error.message || "Server error",
      });
    }
  }

  // Save the updated count
  await uploadCount.save();

  // If there were more candidates than the remaining limit
  if (candidates.length > remainingLimit) {
    results.message = `Only ${remainingLimit} out of ${candidates.length} candidates were processed due to daily upload limit of 50 candidates.`;
  }

  // Return the results
  res.status(200).json({
    status: "success",
    message: "Bulk upload completed",
    results,
  });
});

// Update candidate status
exports.updateCandidateStatus = handleAsync(async (req, res, next) => {
  const { status } = req.body;

  if (!status) {
    return res
      .status(400)
      .json({ status: "fail", message: "Status is required" });
  }

  const candidate = await Candidate.findByIdAndUpdate(
    req.params.id,
    { status },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!candidate) {
    return res
      .status(404)
      .json({ status: "fail", message: "No candidate found with that ID" });
  }

  res.status(200).json({
    status: "success",
    data: {
      candidate,
    },
  });
});

// Get candidates by status
exports.getCandidatesByStatus = handleAsync(async (req, res, next) => {
  const { status } = req.params;

  const candidates = await Candidate.find({ status }).populate(
    "createdBy",
    "name"
  );

  res.status(200).json({
    status: "success",
    results: candidates.length,
    data: {
      candidates,
    },
  });
});

// Get candidates created by current user
exports.getMyCandidates = handleAsync(async (req, res, next) => {
  const candidates = await Candidate.find({ createdBy: req.user.id });

  res.status(200).json({
    status: "success",
    results: candidates.length,
    data: {
      candidates,
    },
  });
});

// Get candidate remark history
exports.getCandidateRemarkHistory = handleAsync(async (req, res, next) => {
  const candidate = await Candidate.findById(req.params.id).populate({
    path: "remarks.employee",
    select: "name",
  });

  if (!candidate) {
    return res
      .status(404)
      .json({ status: "fail", message: "No candidate found with that ID" });
  }

  res.status(200).json({
    status: "success",
    data: {
      candidateName: candidate.name,
      candidateMobile: candidate.mobileNo,
      remarks: candidate.remarks || [],
    },
  });
});

// Get candidate call status history
exports.getCandidateStatusHistory = handleAsync(async (req, res, next) => {
  const candidate = await Candidate.findById(req.params.id).populate({
    path: "callStatusHistory.employee",
    select: "name",
  });

  if (!candidate) {
    return res
      .status(404)
      .json({ status: "fail", message: "No candidate found with that ID" });
  }

  res.status(200).json({
    status: "success",
    data: {
      candidateName: candidate.name,
      candidateMobile: candidate.mobileNo,
      currentStatus: candidate.callStatus,
      statusHistory: candidate.callStatusHistory || [],
    },
  });
});

// Check if a candidate is locked
exports.checkCandidateLockStatus = handleAsync(async (req, res) => {
  const { contactNumber } = req.params;

  if (!contactNumber) {
    return res.status(400).json({
      success: false,
      message: "Contact number is required",
    });
  }

  const lockStatus = await checkCandidateLock(contactNumber);

  if (!lockStatus) {
    return res.status(404).json({
      success: false,
      message: "Candidate not found",
    });
  }

  return res.status(200).json({
    success: true,
    isLocked: lockStatus.isLocked,
    lockExpiryDate: lockStatus.lockExpiryDate,
    message: lockStatus.isLocked
      ? "This candidate is locked due to selection status"
      : "This candidate is not locked",
  });
});

// Check remaining upload quota for today
exports.checkRemainingUploadQuota = handleAsync(async (req, res, next) => {
  // Get today's date with time set to start of day
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check current upload count for this employee today
  let uploadCount = await BulkUploadCount.findOne({
    employee: req.employee._id,
    date: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  const count = uploadCount ? uploadCount.count : 0;
  const remainingQuota = 50 - count;

  return res.status(200).json({
    status: "success",
    data: {
      dailyLimit: 50,
      uploaded: count,
      remaining: remainingQuota,
      canUpload: remainingQuota > 0,
    },
  });
});
