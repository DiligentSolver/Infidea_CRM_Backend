const Candidate = require("../models/candidateModel");
const Employee = require("../models/employeeModel");
const { handleAsync } = require("../utils/attemptAndOtp");
const mongoose = require("mongoose");
const { checkCandidateLock } = require("../utils/candidateLockManager");

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
      const {
        createDuplicityCheckNotification,
      } = require("./notificationController");

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

  // Only lock the candidate if they have a lockable status (lineup or walkin)
  const hasLockableStatus =
    candidate.callStatus &&
    (candidate.callStatus.toLowerCase() === "lineup" ||
      candidate.callStatus.toLowerCase() === "walkin at infidea");

  // Update registration lock
  const registrationLockExpiry = new Date();
  registrationLockExpiry.setDate(registrationLockExpiry.getDate() + 30);

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

  candidate.lastRegisteredBy = req.employee._id;
  candidate.registrationLockExpiry = registrationLockExpiry;
  candidate.isLocked = hasLockableStatus;
  await candidate.save();

  // Send notification to the previous owner
  if (previousOwnerId) {
    try {
      const {
        createCandidateMarkNotification,
      } = require("./notificationController");

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
    // Check if registration lock is still active
    if (
      existingCandidate.isLocked &&
      existingCandidate.registrationLockExpiry &&
      existingCandidate.registrationLockExpiry > new Date()
    ) {
      const remainingDays = Math.ceil(
        (existingCandidate.registrationLockExpiry - new Date()) /
          (1000 * 60 * 60 * 24)
      );

      // Get the employee who registered the candidate
      const registeredBy = await mongoose
        .model("Employee")
        .findById(existingCandidate.lastRegisteredBy);

      return res.status(400).json({
        status: "fail",
        message: `This candidate is already registered by ${registeredBy.name.en}. Please try again after ${remainingDays} days.`,
      });
    }
  }

  // Initialize call duration history if call duration is provided
  const callDurationHistory = [];
  if (callDuration && parseInt(callDuration) > 0) {
    callDurationHistory.push({
      duration: callDuration,
      employee: req.employee._id,
      date: new Date(),
      summary: callSummary || "Initial call",
    });
  }

  // Initialize callStatusHistory
  const callStatusHistory = [];
  if (callStatus) {
    callStatusHistory.push({
      status: callStatus,
      date: new Date(),
      employee: req.employee._id,
    });
  }

  const remarksHistory = [];

  if (remarks) {
    remarksHistory.push({
      remark: remarks,
      date: new Date(),
      employee: req.employee._id,
    });
  }

  // Calculate registration lock expiry and set isLocked only if callStatus is "lineup" or "walkin at infidea"
  let registrationLockExpiry = null;
  let isLocked = false;

  // Only lock if it's a new candidate and the status is either lineup or walkin
  if (
    !existingCandidate &&
    callStatus &&
    (callStatus.toLowerCase() === "lineup" ||
      callStatus.toLowerCase() === "walkin at infidea")
  ) {
    registrationLockExpiry = new Date();
    registrationLockExpiry.setDate(registrationLockExpiry.getDate() + 30);
    isLocked = true;
  }

  // Create new candidate
  const newCandidate = await Candidate.create({
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
    callStatusHistory,
    locality,
    lineupCompany,
    customLineupCompany,
    lineupProcess,
    customLineupProcess,
    lineupDate,
    interviewDate,
    walkinDate,
    createdBy: req.employee._id,
    lastRegisteredBy: req.employee._id,
    registrationLockExpiry,
    isLocked,
    registrationHistory: [
      {
        registeredBy: req.employee._id,
        registrationDate: new Date(),
        status: "Active",
      },
    ],
    callDurationHistory,
    remarks: remarksHistory,
  });

  // Check if callStatus is lineup and create a lineup record
  if (callStatus && callStatus.toLowerCase() === "lineup") {
    const Lineup = require("../models/lineupModel");

    // Check if a lineup record already exists for this candidate
    const existingLineup = await Lineup.findOne({
      contactNumber: mobileNo,
      company: lineupCompany || customLineupCompany,
      process: lineupProcess || customLineupProcess,
      createdBy: req.employee._id,
    });

    // Only create a new lineup record if none exists
    if (!existingLineup) {
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
        remarks: remarksHistory,
      });
    }
  }

  // Check if callStatus is "Walkin at Infidea"
  if (callStatus && callStatus.toLowerCase() === "walkin at infidea") {
    const Walkin = require("../models/walkinModel");

    // Check if a walkin record already exists for this candidate
    const existingWalkin = await Walkin.findOne({
      contactNumber: mobileNo,
      walkinDate: walkinDate,
    });

    // Only create a new walkin record if none exists

    // Only create a new walkin record if none exists
    if (!existingWalkin) {
      // Create the walkin record
      await Walkin.create({
        candidateName: name,
        contactNumber: mobileNo,
        walkinDate: walkinDate,
        remarks: remarksHistory,
        status: "Walkin at Infidea",
        createdBy: req.employee._id,
      });
    }
  }

  res.status(201).json({
    status: "success",
    message: "Candidate Information Saved",
    data: {
      candidate: newCandidate,
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

    const createdByName = employee.find(
      (e) => e._id.toString() === candidate.createdBy.toString()
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
      createdByName,
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

  // Check if remarks are provided
  if (req.body.remarks) {
    // Initialize remarks array if it doesn't exist
    existingCandidate.remarks = existingCandidate.remarks || [];

    // Add new remark to the array
    existingCandidate.remarks.push({
      remark: req.body.remarks,
      date: new Date(),
      employee: req.employee._id,
    });

    // Remove remarks from req.body so it doesn't override the array
    delete req.body.remarks;
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
    // Store the previous owner's ID before we change it
    const previousOwnerId = existingCandidate.lastRegisteredBy
      ? existingCandidate.lastRegisteredBy.toString() ===
        req.employee._id.toString()
        ? null
        : existingCandidate.lastRegisteredBy
      : null;

    // Set registration lock for 30 days
    const registrationLockExpiry = new Date();
    registrationLockExpiry.setDate(registrationLockExpiry.getDate() + 30);

    req.body.registrationLockExpiry = registrationLockExpiry;
    req.body.isLocked = true;

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

    // Send notification to the previous owner if it's a different employee
    if (previousOwnerId) {
      try {
        const {
          createCandidateMarkNotification,
        } = require("./notificationController");

        const markingEmployee = await Employee.findById(req.employee._id);

        await createCandidateMarkNotification(
          existingCandidate,
          markingEmployee,
          previousOwnerId,
          req.io
        );
      } catch (error) {
        console.error(
          "Error sending notification during status update:",
          error
        );
        // Continue with the update even if notification fails
      }
    }
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

  if (existingCandidate.remarks) {
    updatedData.remarks = existingCandidate.remarks;
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
      remarks: req.body.remarks,
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
    });

    // Only create a new walkin record if none exists
    if (!existingWalkin) {
      // Create the walkin record
      await Walkin.create({
        candidateName: req.body.name || candidate.name,
        contactNumber: req.body.mobileNo || candidate.mobileNo,
        walkinDate: req.body.walkinDate,
        remarks: req.body.remarks,
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

  const results = {
    total: candidates.length,
    successful: 0,
    marked: 0,
    failed: 0,
    details: [],
  };

  // Process each candidate
  for (const candidate of candidates) {
    let existingCandidate = null;
    let remainingDays = 0;
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
        // Check if registration lock is still active - candidates are only locked when in lineup or walkin
        if (
          existingCandidate.isLocked &&
          existingCandidate.registrationLockExpiry &&
          existingCandidate.registrationLockExpiry > new Date()
        ) {
          remainingDays = Math.ceil(
            (existingCandidate.registrationLockExpiry - new Date()) /
              (1000 * 60 * 60 * 24)
          );

          results.failed++;
          results.details.push({
            mobileNo: candidate.mobileNo,
            name: candidate.name,
            status: "Failed",
            reason: `Already registered by ${
              existingCandidate.lastRegisteredBy?.name?.en || "another employee"
            }. Locked for ${remainingDays} more days.`,
          });
          continue;
        }

        // Check if current employee is the last registered by
        const isLastRegisteredBy =
          existingCandidate.lastRegisteredBy &&
          existingCandidate.lastRegisteredBy._id &&
          existingCandidate.lastRegisteredBy._id.toString() ===
            req.employee._id.toString();

        // Check if current employee already exists in registration history
        let alreadyInHistory = false;
        if (
          existingCandidate.registrationHistory &&
          existingCandidate.registrationHistory.length > 0
        ) {
          for (const entry of existingCandidate.registrationHistory) {
            if (
              entry.registeredBy &&
              entry.registeredBy.toString() === req.employee._id.toString()
            ) {
              alreadyInHistory = true;
              break;
            }
          }
        }

        // If already registered by this employee or in history, skip marking
        if (alreadyInHistory || isLastRegisteredBy) {
          results.failed++;
          results.details.push({
            mobileNo: candidate.mobileNo,
            name: candidate.name,
            status: "Failed",
            reason:
              "You have already registered this candidate previously. You cannot mark again.",
          });
          continue;
        }

        // Store the previous owner's ID before we change it
        const previousOwnerId = existingCandidate.lastRegisteredBy
          ? existingCandidate.lastRegisteredBy._id
          : null;

        // If candidate exists but is not locked and not already registered by this employee, mark them
        // Only lock the candidate if they have a lockable status (lineup or walkin)
        const hasLockableStatus =
          existingCandidate.callStatus &&
          (existingCandidate.callStatus.toLowerCase() === "lineup" ||
            existingCandidate.callStatus.toLowerCase() === "walkin at infidea");

        // Update registration lock
        const registrationLockExpiry = new Date();
        registrationLockExpiry.setDate(registrationLockExpiry.getDate() + 30);

        // Mark previous history entries as expired
        if (existingCandidate.registrationHistory) {
          existingCandidate.registrationHistory.forEach((entry) => {
            if (entry.status === "Active") {
              entry.status = "Expired";
            }
          });
        } else {
          existingCandidate.registrationHistory = [];
        }

        // Add current employee to registration history
        existingCandidate.registrationHistory.push({
          registeredBy: req.employee._id,
          registrationDate: new Date(),
          status: "Active",
        });

        // Add remark about being marked during bulk upload
        existingCandidate.remarks = existingCandidate.remarks || [];
        existingCandidate.remarks.push({
          remark: "Marked during Excel import",
          date: new Date(),
          employee: req.employee._id,
        });

        // Update lastRegisteredBy to the current employee
        existingCandidate.lastRegisteredBy = req.employee._id;
        existingCandidate.registrationLockExpiry = registrationLockExpiry;
        existingCandidate.isLocked = hasLockableStatus;

        // Save the changes
        await existingCandidate.save();

        // Send notification to the previous owner
        if (previousOwnerId) {
          try {
            const {
              createCandidateMarkNotification,
            } = require("./notificationController");

            const markingEmployee = await Employee.findById(req.employee._id);

            await createCandidateMarkNotification(
              existingCandidate,
              markingEmployee,
              previousOwnerId,
              req.io
            );
          } catch (error) {
            console.error(
              "Error sending notification during bulk upload:",
              error
            );
            // Continue with the process even if notification fails
          }
        }

        // Increment marked count
        results.marked++;
        results.details.push({
          mobileNo: candidate.mobileNo,
          name: candidate.name,
          status: "Marked",
          id: existingCandidate._id,
        });
        continue;
      }

      // Initialize call duration history (defaults to 0 for imported records)
      const callDurationHistory = [
        {
          duration: "0",
          employee: req.employee._id,
          date: new Date(),
          summary: "Imported from Excel",
        },
      ];

      // Initialize call status history
      const callStatusHistory = [
        {
          status: "New",
          date: new Date(),
          employee: req.employee._id,
        },
      ];

      // Initialize remarks with import information
      const remarks = [
        {
          remark: "Imported from Excel",
          date: new Date(),
          employee: req.employee._id,
        },
      ];

      // Create default values for required fields
      // Note: Bulk uploaded candidates start with "New" status so they are not locked
      // They will only be locked when their status changes to "lineup" or "walkin at infidea"
      const newCandidate = await Candidate.create({
        name: candidate.name,
        mobileNo: candidate.mobileNo,
        whatsappNo: candidate.whatsappNo || "Not Specified",
        source: "Excel Import",
        gender: candidate.gender || "Not Specified",
        experience: candidate.experience || "Not Specified",
        qualification: candidate.qualification || "Not Specified",
        state: candidate.state || "Not Specified",
        city: candidate.city || "Not Specified",
        salaryExpectation: candidate.salaryExpectation || "Not Specified",
        communication: candidate.communication || "Not Specified",
        noticePeriod: candidate.noticePeriod || "Not Specified",
        shift: candidate.shift || "Not Specified",
        relocation: candidate.relocation || "Not Specified",
        companyProfile: candidate.companyProfile || "Not Specified",
        callStatus: "New",
        callStatusHistory,
        createdBy: req.employee._id,
        lastRegisteredBy: req.employee._id,
        isLocked: false, // Not locked initially, only when added to lineup or walkin
        registrationHistory: [
          {
            registeredBy: req.employee._id,
            registrationDate: new Date(),
            status: "Active",
          },
        ],
        callDurationHistory,
        remarks,
      });

      results.successful++;
      results.details.push({
        mobileNo: candidate.mobileNo,
        name: candidate.name,
        status: "Success",
        id: newCandidate._id,
      });
    } catch (error) {
      results.failed++;
      let reason = error.message;
      // Check for MongoDB duplicate key error
      if (
        error.code === 11000 &&
        error.keyPattern &&
        error.keyPattern.mobileNo
      ) {
        let lockInfo = "";
        if (
          existingCandidate &&
          existingCandidate.isLocked &&
          existingCandidate.registrationLockExpiry &&
          existingCandidate.registrationLockExpiry > new Date()
        ) {
          lockInfo = `Locked for ${remainingDays} more days.`;
        } else {
          lockInfo = "Not locked by anyone.";
        }
        reason = `This number already exists & ${lockInfo}`;
      }
      results.details.push({
        mobileNo: candidate.mobileNo || "Unknown",
        name: candidate.name || "Unknown",
        status: "Failed",
        reason,
      });
    }
  }

  res.status(200).json({
    status: "success",
    message: `${results.successful} new candidates created, ${results.marked} existing candidates marked, and ${results.failed} failed out of ${results.total}.`,
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
