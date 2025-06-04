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
  hasActiveJoining,
  JOINING_LOCK_DAYS,
} = require("../utils/candidateLockManager");
const BulkUploadCount = require("../models/bulkUploadCountModel");
const dateUtils = require("../utils/dateUtils");
const Joining = require("../models/joiningModel");

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

  if (
    candidate.isLocked &&
    candidate.registrationLockExpiry > dateUtils.getCurrentDate()
  ) {
    const diffMs =
      candidate.registrationLockExpiry - dateUtils.getCurrentDate();
    remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      remainingTime = `${hours}h ${minutes}m`;
    }
  }

  // Notify the original employee who registered this candidate
  // only if it's a different employee checking AND candidate has specific status
  const notificationStatuses = [
    "Joined",
    "Pipeline",
    "Walkin At Infidea",
    "Lineup",
  ];
  if (
    candidate.lastRegisteredBy &&
    candidate.lastRegisteredBy._id.toString() !== req.employee._id.toString() &&
    notificationStatuses.includes(candidate.callStatus)
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
      candidate.isLocked &&
      candidate.registrationLockExpiry > dateUtils.getCurrentDate(),
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

  // Store the previous owner's ID before we change it
  const previousOwnerId = candidate.lastRegisteredBy
    ? candidate.lastRegisteredBy._id
    : null;

  // Send notification to the previous owner only for specific statuses
  const notificationStatuses = [
    "Joined",
    "Pipeline",
    "Walkin At Infidea",
    "Lineup",
  ];
  if (previousOwnerId && notificationStatuses.includes(candidate.callStatus)) {
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

  if (
    candidate.isLocked &&
    candidate.registrationLockExpiry > dateUtils.getCurrentDate()
  ) {
    const diffMs =
      candidate.registrationLockExpiry - dateUtils.getCurrentDate();
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

  // Check if candidate has an active joining
  const joiningActive = hasActiveJoining(candidate.mobileNo);
  if (joiningActive) {
    return res.status(400).json({
      status: "fail",
      message: "Cannot mark candidate with active joining",
      hasActiveJoining: true,
    });
  }

  if (
    candidate.isLocked &&
    candidate.registrationLockExpiry > dateUtils.getCurrentDate()
  ) {
    const diffMs =
      candidate.registrationLockExpiry - dateUtils.getCurrentDate();
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

  // Check if current employee already exists in registration history with Active status
  let alreadyInHistory = false;
  if (
    candidate.registrationHistory &&
    candidate.registrationHistory.length > 0
  ) {
    alreadyInHistory = candidate.registrationHistory.some(
      (entry) =>
        entry.registeredBy &&
        entry.registeredBy._id &&
        entry.registeredBy._id.toString() === req.employee._id.toString() &&
        entry.status === "Active"
    );
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

  // Mark all existing active registrations as expired
  if (candidate.registrationHistory) {
    candidate.registrationHistory.forEach((entry) => {
      if (entry.status === "Active") {
        entry.status = "Expired";
      }
    });
  }

  // Add new registration history entry
  candidate.registrationHistory.push({
    registeredBy: req.employee._id,
    registrationDate: dateUtils.getCurrentDate(),
    status: "Active",
  });

  // Update the lastRegisteredBy to the current employee
  candidate.lastRegisteredBy = req.employee._id;

  // Important: When marking a candidate, we DO NOT lock them
  candidate.isLocked = false;
  candidate.registrationLockExpiry = null;

  // Add a remark about the marking
  if (!candidate.remarks) {
    candidate.remarks = [];
  }
  candidate.remarks.push({
    remark: "Candidate marked",
    date: dateUtils.getCurrentDate(),
    employee: req.employee._id,
  });

  // Save all changes
  await candidate.save();

  // Send notification to the previous owner
  if (
    previousOwnerId &&
    previousOwnerId.toString() !== req.employee._id.toString()
  ) {
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

  // Fetch the updated candidate with populated fields
  const updatedCandidate = await Candidate.findById(candidate._id)
    .populate("lastRegisteredBy", "name")
    .populate("registrationHistory.registeredBy", "name");

  res.status(200).json({
    status: "success",
    message: "Candidate marked successfully",
    candidate: updatedCandidate,
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
    passingYear,
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

  // Check if number exists in joining with "Joining Details Received" status
  const joiningActive = await hasActiveJoining(mobileNo);

  if (joiningActive) {
    return res.status(409).json({
      status: "fail",
      message: "This number is locked due to an active joining record",
    });
  }

  // Initialize callStatusHistory
  const callStatusHistory = [];
  callStatusHistory.push({
    status: callStatus || "New",
    date: dateUtils.getCurrentDate(),
    employee: req.employee._id,
  });

  // Initialize callDurationHistory if provided
  const callDurationHistory = [];
  if (callDuration) {
    callDurationHistory.push({
      duration: callDuration,
      date: dateUtils.getCurrentDate(),
      employee: req.employee._id,
      summary: callSummary,
    });
  }

  // Initialize remarks if provided
  const remarksHistory = [];
  if (remarks) {
    remarksHistory.push({
      remark: remarks,
      date: dateUtils.getCurrentDate(),
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
    registrationLockExpiry = dateUtils.getCurrentDate();
    registrationLockExpiry.setDate(
      registrationLockExpiry.getDate() + LINEUP_LOCK_DAYS
    );
    isLocked = true;
  }

  // Initialize registration history
  const registrationHistory = [
    {
      registeredBy: req.employee._id,
      registrationDate: dateUtils.getCurrentDate(),
      status: "Active",
    },
  ];

  // Add lineup remarks history if status is lineup
  if (callStatus && callStatus.toLowerCase() === "lineup") {
    lineupRemarksHistory.push({
      remark: remarks || "Initial lineup created",
      date: dateUtils.getCurrentDate(),
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
      date: dateUtils.getCurrentDate(),
      employee: req.employee._id,
      walkinDate: new Date(walkinDate),
    });
  }

  // Create candidate record
  const candidate = await Candidate.create({
    name: name || "-",
    mobileNo: mobileNo || "-",
    whatsappNo: whatsappNo || "-",
    source: source || "-",
    gender: gender || "-",
    experience: experience || "-",
    qualification: qualification || "-",
    passingYear: passingYear || "-",
    state: state || "-",
    city: city || "-",
    salaryExpectation: salaryExpectation || "-",
    communication: communication || "-",
    noticePeriod: noticePeriod || "-",
    shift: shift || "-",
    relocation: relocation || "-",
    companyProfile: companyProfile || "-",
    callStatus: callStatus || "New",
    createdBy: req.employee._id,
    lastRegisteredBy: req.employee._id,
    callStatusHistory: callStatusHistory,
    callDurationHistory: callDurationHistory,
    remarks: remarksHistory,
    locality: locality || "-",
    lineupCompany: lineupCompany || "-",
    customLineupCompany: customLineupCompany || "-",
    lineupProcess: lineupProcess || "-",
    customLineupProcess: customLineupProcess || "-",
    lineupDate: lineupDate || "-",
    interviewDate: interviewDate || "-",
    walkinDate: walkinDate || "-",
    registrationHistory: registrationHistory,
    registrationLockExpiry: registrationLockExpiry,
    isLocked: isLocked,
    lineupRemarksHistory: lineupRemarksHistory,
    walkinRemarksHistory: walkinRemarksHistory,
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
      remarks: remarks || "Initial lineup created",
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
      walkinRemarks: remarks || "Initial walkin created",
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
  // Find all candidates where the employee is involved
  const candidates = await Candidate.find({
    $or: [
      { lastRegisteredBy: req.employee._id },
      { createdBy: req.employee._id },
      {
        registrationHistory: {
          $elemMatch: {
            registeredBy: req.employee._id,
          },
        },
      },
    ],
  })
    .populate("lastRegisteredBy", "name")
    .populate("createdBy", "name")
    .populate("registrationHistory.registeredBy", "name")
    .sort({ updatedAt: -1 });

  // Get all employees for reference
  const employees = await Employee.find({}, "name");

  // Add registration status info for each candidate
  const candidatesWithStatus = await Promise.all(
    candidates.map(async (candidate) => {
      const isLockedByMe =
        candidate.isLocked &&
        candidate.lastRegisteredBy &&
        candidate.lastRegisteredBy._id &&
        candidate.lastRegisteredBy._id.toString() ===
          req.employee._id.toString();

      const isLastRegisteredByMe =
        candidate.lastRegisteredBy &&
        candidate.lastRegisteredBy._id &&
        candidate.lastRegisteredBy._id.toString() ===
          req.employee._id.toString();

      const lastRegisteredByEmployee = employees.find(
        (emp) =>
          emp._id.toString() === candidate.lastRegisteredBy._id.toString()
      );

      const lastRegisteredByName = lastRegisteredByEmployee
        ? lastRegisteredByEmployee.name.en
        : "Unknown";

      let remainingDays = 0;
      let remainingTime = null;

      if (
        candidate.isLocked &&
        candidate.registrationLockExpiry > dateUtils.getCurrentDate()
      ) {
        const diffMs =
          candidate.registrationLockExpiry - dateUtils.getCurrentDate();
        remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          remainingTime = `${hours}h ${minutes}m`;
        }
      }

      // Get active registration entry for this employee
      const myActiveRegistration = candidate.registrationHistory.find(
        (entry) =>
          entry.registeredBy._id.toString() === req.employee._id.toString() &&
          entry.status === "Active"
      );

      // Filter histories to only include the current employee's entries
      const employeeCallHistory = (candidate.callDurationHistory || []).filter(
        (record) =>
          record.employee &&
          record.employee.toString() === req.employee._id.toString()
      );

      const callSummary = candidate.callDurationHistory.map((record) => ({
        date: record.date,
        summary: record.summary,
      }));

      // Check if candidate has an active joining
      const joiningActive = await hasActiveJoining(candidate.mobileNo);

      // A candidate is not editable if it has an active joining
      const editable = !joiningActive;

      return {
        ...candidate.toObject(),
        isLockedByMe,
        isLastRegisteredByMe,
        lastRegisteredByName,
        remainingDays,
        remainingTime,
        employeeCallHistory,
        callSummary,
        editable,
        hasActiveJoining: joiningActive,
        isActivelyRegisteredByMe: !!myActiveRegistration,
        registrationDate: myActiveRegistration
          ? myActiveRegistration.registrationDate
          : null,
      };
    })
  );

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

  // Check if candidate has an active joining
  const joiningActive = await hasActiveJoining(candidate.mobileNo);

  // A candidate is not editable if it has an active joining
  const editable = !joiningActive;

  const candidateData = {
    ...candidate.toObject(),
    editable,
    hasActiveJoining: joiningActive,
  };

  res.status(200).json({
    status: "success",
    data: {
      candidate: candidateData,
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
  const existingCandidate = await Candidate.findById(req.params.candidateId)
    .populate("lastRegisteredBy", "name")
    .populate("registrationHistory.registeredBy", "name");

  if (!existingCandidate) {
    return res.status(404).json({
      status: "fail",
      message: "No candidate found with that ID",
    });
  }

  // Check for joining lock - if candidate has a joining with status "Joining Details Received", prevent edits
  const joiningActive = await hasActiveJoining(existingCandidate.mobileNo);

  if (joiningActive) {
    // Calculate 90-day lock expiry date for display purposes
    const lockExpiryDate = new Date();
    lockExpiryDate.setDate(lockExpiryDate.getDate() + JOINING_LOCK_DAYS);

    return res.status(403).json({
      status: "fail",
      message: "This candidate is locked due to an active joining record",
      lockType: "joining",
      lockExpiryDays: JOINING_LOCK_DAYS,
      lockExpiryDate: lockExpiryDate,
      editable: false,
      hasActiveJoining: true,
    });
  }

  // Check if candidate is locked by another employee
  const isLocked =
    existingCandidate.isLocked &&
    existingCandidate.registrationLockExpiry &&
    existingCandidate.registrationLockExpiry > dateUtils.getCurrentDate();

  // Check if current employee is the last registered by
  const isLastRegisteredBy =
    existingCandidate.lastRegisteredBy &&
    existingCandidate.lastRegisteredBy._id.toString() ===
      req.employee._id.toString();

  // Store the previous owner's ID before we change it
  const previousOwnerId = existingCandidate.lastRegisteredBy
    ? existingCandidate.lastRegisteredBy._id
    : null;

  // Check if current employee already exists in registration history with Active status
  let alreadyInHistory = false;
  if (
    existingCandidate.registrationHistory &&
    existingCandidate.registrationHistory.length > 0
  ) {
    alreadyInHistory = existingCandidate.registrationHistory.some(
      (entry) =>
        entry.registeredBy &&
        entry.registeredBy._id &&
        entry.registeredBy._id.toString() === req.employee._id.toString() &&
        entry.status === "Active"
    );
  }

  // Don't allow edits if locked by someone else and not marked by current employee
  if (isLocked && !isLastRegisteredBy && !alreadyInHistory) {
    return res.status(403).json({
      status: "fail",
      message: "Candidate is locked by another employee and not marked by you",
      lockExpiryDate: existingCandidate.registrationLockExpiry,
    });
  }

  // If not already marked by current employee, mark the candidate
  if (!isLastRegisteredBy && !alreadyInHistory) {
    // Mark all existing active registrations as expired
    if (existingCandidate.registrationHistory) {
      existingCandidate.registrationHistory.forEach((entry) => {
        if (entry.status === "Active") {
          entry.status = "Expired";
        }
      });
    }

    // Add new registration history entry
    existingCandidate.registrationHistory.push({
      registeredBy: req.employee._id,
      registrationDate: dateUtils.getCurrentDate(),
      status: "Active",
    });

    // Update the lastRegisteredBy to the current employee
    existingCandidate.lastRegisteredBy = req.employee._id;

    // Add a remark about the marking
    if (!existingCandidate.remarks) {
      existingCandidate.remarks = [];
    }
    existingCandidate.remarks.push({
      remark: "Candidate marked during update",
      date: dateUtils.getCurrentDate(),
      employee: req.employee._id,
    });

    // Send notification to the previous owner if exists and is different from current employee
    if (
      previousOwnerId &&
      previousOwnerId.toString() !== req.employee._id.toString()
    ) {
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
        // Continue with the update even if notification fails
      }
    }
  }

  // Original update logic continues below
  // Check if there's a new call duration entry
  if (req.body.callDuration) {
    const newCallDuration = {
      duration: req.body.callDuration,
      employee: req.employee._id,
      date: dateUtils.getCurrentDate(),
      summary: req.body.callSummary || "",
    };

    // Add the new duration to history
    if (!existingCandidate.callDurationHistory) {
      existingCandidate.callDurationHistory = [];
    }
    existingCandidate.callDurationHistory.push(newCallDuration);
    req.body.callDurationHistory = existingCandidate.callDurationHistory;
  }

  // Check for call status change
  if (
    req.body.callStatus &&
    req.body.callStatus !== existingCandidate.callStatus
  ) {
    const newStatusEntry = {
      status: req.body.callStatus,
      date: dateUtils.getCurrentDate(),
      employee: req.employee._id,
    };

    // Add the new status entry to history
    if (!existingCandidate.callStatusHistory) {
      existingCandidate.callStatusHistory = [];
    }
    existingCandidate.callStatusHistory.push(newStatusEntry);
    req.body.callStatusHistory = existingCandidate.callStatusHistory;
  }

  // Check for new remarks
  if (req.body.remarks) {
    const newRemark = {
      remark: req.body.remarks,
      date: dateUtils.getCurrentDate(),
      employee: req.employee._id,
    };

    // Add to remarks history
    if (!existingCandidate.remarks) {
      existingCandidate.remarks = [];
    }
    existingCandidate.remarks.push(newRemark);
    req.body.remarks = existingCandidate.remarks;
  }

  // Handle lineup remarks if provided
  if (
    (req.body.lineupRemarks || req.body.lineupRemarks === "") &&
    req.body.lineupCompany &&
    req.body.lineupProcess &&
    req.body.lineupDate &&
    req.body.interviewDate
  ) {
    if (!existingCandidate.lineupRemarksHistory) {
      existingCandidate.lineupRemarksHistory = [];
    }

    // Use previous remarks if new ones are empty
    const remarkText =
      req.body.lineupRemarks === undefined ||
      req.body.lineupRemarks === null ||
      req.body.lineupRemarks === ""
        ? existingCandidate.lineupRemarksHistory.length > 0
          ? existingCandidate.lineupRemarksHistory[
              existingCandidate.lineupRemarksHistory.length - 1
            ].remark
          : "Updated lineup"
        : req.body.lineupRemarks;

    existingCandidate.lineupRemarksHistory.push({
      remark: remarkText,
      date: dateUtils.getCurrentDate(),
      employee: req.employee._id,
      company: req.body.lineupCompany,
      process: req.body.lineupProcess,
      lineupDate: new Date(req.body.lineupDate),
      interviewDate: new Date(req.body.interviewDate),
    });

    req.body.lineupRemarksHistory = existingCandidate.lineupRemarksHistory;
  }

  // Handle walkin remarks if provided
  if (
    (req.body.walkinRemarks || req.body.walkinRemarks === "") &&
    req.body.walkinDate
  ) {
    if (!existingCandidate.walkinRemarksHistory) {
      existingCandidate.walkinRemarksHistory = [];
    }

    // Use previous remarks if new ones are empty
    const remarkText =
      req.body.walkinRemarks === undefined ||
      req.body.walkinRemarks === null ||
      req.body.walkinRemarks === ""
        ? existingCandidate.walkinRemarksHistory.length > 0
          ? existingCandidate.walkinRemarksHistory[
              existingCandidate.walkinRemarksHistory.length - 1
            ].remark
          : "Updated walkin"
        : req.body.walkinRemarks;

    existingCandidate.walkinRemarksHistory.push({
      remark: remarkText,
      date: dateUtils.getCurrentDate(),
      employee: req.employee._id,
      walkinDate: new Date(req.body.walkinDate),
    });

    req.body.walkinRemarksHistory = existingCandidate.walkinRemarksHistory;
  }

  // Check if moving to a lockable status (Lineup or Walkin at Infidea)
  const isMovingToLockableStatus =
    req.body.callStatus &&
    (req.body.callStatus.toLowerCase() === "lineup" ||
      req.body.callStatus.toLowerCase() === "walkin at infidea");

  // Check if was already a lockable status
  const wasAlreadyLockableStatus =
    existingCandidate.callStatus &&
    (existingCandidate.callStatus.toLowerCase() === "lineup" ||
      existingCandidate.callStatus.toLowerCase() === "walkin at infidea");

  // Check if the candidate is not already locked and either:
  // 1. The candidate is being moved to a lockable status from a non-lockable status, or
  // 2. This is a re-lock after an expiry of a previous lock
  if (
    isMovingToLockableStatus &&
    (!existingCandidate.isLocked ||
      existingCandidate.registrationLockExpiry < dateUtils.getCurrentDate()) &&
    (!wasAlreadyLockableStatus ||
      existingCandidate.registrationLockExpiry < dateUtils.getCurrentDate())
  ) {
    // Set registration lock for lineup days
    const registrationLockExpiry = dateUtils.addTime(
      dateUtils.getCurrentDate(),
      LINEUP_LOCK_DAYS,
      "days"
    );

    req.body.registrationLockExpiry = registrationLockExpiry;
    req.body.isLocked = true;
  }

  // Merge the candidate data with the request body and registration history
  const updatedData = {
    ...req.body,
    registrationHistory: existingCandidate.registrationHistory,
    lastRegisteredBy: existingCandidate.lastRegisteredBy,
    callDurationHistory: existingCandidate.callDurationHistory,
    callStatusHistory: existingCandidate.callStatusHistory,
    lineupRemarksHistory: existingCandidate.lineupRemarksHistory,
    walkinRemarksHistory: existingCandidate.walkinRemarksHistory,
    remarks: existingCandidate.remarks,
  };

  // Update the candidate
  const candidate = await Candidate.findByIdAndUpdate(
    req.params.candidateId,
    updatedData,
    {
      new: true,
      runValidators: true,
    }
  );

  // Check if callStatus is lineup and create/update lineup record
  if (req.body.callStatus && req.body.callStatus.toLowerCase() === "lineup") {
    const Lineup = require("../models/lineupModel");

    // Check if lineup record already exists
    const existingLineup = await Lineup.findOne({
      contactNumber: candidate.mobileNo,
      lineupDate: req.body.lineupDate,
      interviewDate: req.body.interviewDate,
    });

    if (!existingLineup) {
      // Create new lineup record
      await Lineup.create({
        name: candidate.name,
        contactNumber: candidate.mobileNo,
        company: req.body.lineupCompany || req.body.customLineupCompany,
        process: req.body.lineupProcess || req.body.customLineupProcess,
        lineupDate: req.body.lineupDate,
        interviewDate: req.body.interviewDate,
        status: "Scheduled",
        createdBy: req.employee._id,
        remarks: req.body.lineupRemarks || "Updated from candidate",
      });
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
    });

    // Only create a new walkin record if none exists
    if (!existingWalkin) {
      // Create the walkin record
      await Walkin.create({
        candidateName: req.body.name || candidate.name,
        contactNumber: req.body.mobileNo || candidate.mobileNo,
        walkinDate: req.body.walkinDate,
        walkinRemarks: req.body.walkinRemarks || "Updated from candidate",
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
  const candidate = await Candidate.findById(req.params.id);

  if (!candidate) {
    return res
      .status(404)
      .json({ status: "fail", message: "No candidate found with that ID" });
  }

  // Check if candidate has an active joining
  const joiningActive = hasActiveJoining(candidate.mobileNo);

  if (joiningActive) {
    return res.status(403).json({
      status: "fail",
      message:
        "This candidate cannot be deleted as it's part of an active joining",
      hasActiveJoining: true,
      editable: false,
    });
  }

  await Candidate.findByIdAndDelete(req.params.id);

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
          registrationLockExpiry = dateUtils.getCurrentDate();
          registrationLockExpiry.setDate(
            registrationLockExpiry.getDate() + LINEUP_LOCK_DAYS
          );
          isLocked = true;
        }

        // Initialize call status history
        const callStatusHistory = [
          {
            status: callStatus,
            date: dateUtils.getCurrentDate(),
            employee: req.employee._id,
          },
        ];

        // Initialize registration history
        const registrationHistory = [
          {
            registeredBy: req.employee._id,
            registrationDate: dateUtils.getCurrentDate(),
            status: "Active",
          },
        ];

        // Create the new candidate
        const newCandidate = await Candidate.create({
          name: candidate.name,
          mobileNo: candidate.mobileNo,
          whatsappNo: candidate.whatsappNo || candidate.mobileNo,
          source: candidate.source || "-",
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
              date: dateUtils.getCurrentDate(),
              summary: "-",
            },
          ],
          remarks: [
            {
              remark: "-",
              date: dateUtils.getCurrentDate(),
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
            remarks: "-",
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
            remarks: "-",
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

  // Add editable property to each candidate
  const candidatesWithEditFlag = await Promise.all(
    candidates.map(async (candidate) => {
      // Check if candidate has an active joining
      const joiningActive = await hasActiveJoining(candidate.mobileNo);

      // A candidate is not editable if it has an active joining
      const editable = !joiningActive;

      return {
        ...candidate.toObject(),
        editable,
        hasActiveJoining: joiningActive,
      };
    })
  );

  res.status(200).json({
    status: "success",
    results: candidatesWithEditFlag.length,
    data: {
      candidates: candidatesWithEditFlag,
    },
  });
});

// Get candidates created by current user
exports.getMyCandidates = handleAsync(async (req, res, next) => {
  const candidates = await Candidate.find({ createdBy: req.user.id });

  // Add editable property to each candidate
  const candidatesWithEditFlag = await Promise.all(
    candidates.map(async (candidate) => {
      // Check if candidate has an active joining
      const joiningActive = await hasActiveJoining(candidate.mobileNo);

      // A candidate is not editable if it has an active joining
      const editable = !joiningActive;

      return {
        ...candidate.toObject(),
        editable,
        hasActiveJoining: joiningActive,
      };
    })
  );

  res.status(200).json({
    status: "success",
    results: candidatesWithEditFlag.length,
    data: {
      candidates: candidatesWithEditFlag,
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

// Test candidate editability
exports.testCandidateEditability = handleAsync(async (req, res, next) => {
  const { contactNumber } = req.params;

  if (!contactNumber) {
    return res.status(400).json({
      status: "fail",
      message: "Contact number is required",
    });
  }

  const candidate = await Candidate.findOne({ mobileNo: contactNumber });

  if (!candidate) {
    return res.status(404).json({
      status: "fail",
      message: "No candidate found with that contact number",
    });
  }

  // Check if candidate has an active joining
  const joiningActive = await hasActiveJoining(contactNumber);

  // A candidate is not editable if it has an active joining
  const editable = !joiningActive;

  // Get any active joining info
  let activeJoining = null;
  if (joiningActive) {
    activeJoining = await Joining.findOne({
      contactNumber,
      status: "Joining Details Received",
    })
      .populate("company", "companyName")
      .populate("process", "processName");
  }

  res.status(200).json({
    status: "success",
    data: {
      candidateName: candidate.name,
      contactNumber: candidate.mobileNo,
      editable,
      hasActiveJoining: joiningActive,
      activeJoining: activeJoining
        ? {
            company: activeJoining.company?.companyName || "Custom Company",
            process: activeJoining.process?.processName || "Custom Process",
            joiningDate: activeJoining.joiningDate,
            joiningType: activeJoining.joiningType,
          }
        : null,
    },
  });
});

// Get candidate name by mobile number
exports.getCandidateByMobile = handleAsync(async (req, res, next) => {
  const { mobileNo } = req.params;

  if (!mobileNo) {
    return res.status(400).json({
      status: "fail",
      message: "Mobile number is required",
    });
  }

  const candidate = await Candidate.findOne({ mobileNo });

  if (!candidate) {
    return res.status(404).json({
      status: "fail",
      message: "No candidate found with that mobile number",
    });
  }

  res.status(200).json({
    status: "success",
    name: candidate.name,
  });
});
