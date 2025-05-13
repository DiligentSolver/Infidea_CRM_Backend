const sendEmail = require("./emailService");
const employeeLogoutReportTemplate = require("./emailTemplates/employeeLogoutReportTemplate");
const Activity = require("../models/activityModel");
const Employee = require("../models/employeeModel");
const Lineup = require("../models/lineupModel");
const Candidate = require("../models/candidateModel");
const Joining = require("../models/joiningModel");
const { generateActivityExcelReport } = require("./excelReportGenerator");

/**
 * Calculate duration between two dates in hours:minutes format
 * @param {Date} startTime
 * @param {Date} endTime
 * @returns {String} - Duration in hours:minutes format
 */
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return "N/A";

  const durationMs = new Date(endTime) - new Date(startTime);
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationMinutes = Math.floor(
    (durationMs % (1000 * 60 * 60)) / (1000 * 60)
  );

  return `${durationHours}h ${durationMinutes}m`;
};

/**
 * Get employee activities for the current day
 * @param {String} employeeId - Employee ID
 * @returns {Object} - Activity summary with total working time and activities
 */
const getEmployeeActivities = async (employeeId) => {
  // Set today's date to start of day for accurate comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get all activities for today
  const activities = await Activity.find({
    employeeId,
    startTime: { $gte: today, $lt: tomorrow },
  }).sort({ startTime: 1 });

  // Calculate total working time
  let totalWorkingTimeMs = 0;

  // Process activities and calculate durations
  const processedActivities = activities.map((activity) => {
    const startTime = new Date(activity.startTime);
    const endTime = activity.endTime ? new Date(activity.endTime) : new Date();
    const durationMs = endTime - startTime;
    totalWorkingTimeMs += durationMs;

    return {
      type: activity.type,
      startTime: activity.startTime,
      endTime: activity.endTime,
      duration: calculateDuration(startTime, endTime),
    };
  });

  // Format total working time
  const totalWorkingHours = Math.floor(totalWorkingTimeMs / (1000 * 60 * 60));
  const totalWorkingMinutes = Math.floor(
    (totalWorkingTimeMs % (1000 * 60 * 60)) / (1000 * 60)
  );
  const formattedTotalTime = `${totalWorkingHours}h ${totalWorkingMinutes}m`;

  return {
    totalWorkingTime: formattedTotalTime,
    activities: processedActivities,
  };
};

/**
 * Get employee candidate-related work for the current day
 * @param {String} employeeId - Employee ID
 * @returns {Object} - Work summary with lineups, candidates handled, selections, joinings
 */
const getEmployeeCandidateWork = async (employeeId) => {
  // Set today's date to start of day for accurate comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Fetch today's lineups created by the employee
  const lineups = await Lineup.find({
    createdBy: employeeId,
    createdAt: { $gte: today, $lt: tomorrow },
  }).lean();

  // Fetch today's candidates updated by the employee (based on remarks or call status history)
  const candidates = await Candidate.find({
    $or: [
      {
        "remarks.employee": employeeId,
        "remarks.date": { $gte: today, $lt: tomorrow },
      },
      {
        "callStatusHistory.employee": employeeId,
        "callStatusHistory.date": { $gte: today, $lt: tomorrow },
      },
      {
        "callDurationHistory.employee": employeeId,
        "callDurationHistory.date": { $gte: today, $lt: tomorrow },
      },
      { createdBy: employeeId, createdAt: { $gte: today, $lt: tomorrow } },
    ],
  }).lean();

  // Group candidates by call status
  const candidatesByStatus = {};
  candidates.forEach((candidate) => {
    // Find latest call status for this candidate today by this employee
    const todayStatuses = candidate.callStatusHistory
      .filter(
        (status) =>
          status.employee.toString() === employeeId.toString() &&
          new Date(status.date) >= today &&
          new Date(status.date) < tomorrow
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const latestStatus =
      todayStatuses.length > 0 ? todayStatuses[0].status : candidate.callStatus;

    if (!candidatesByStatus[latestStatus]) {
      candidatesByStatus[latestStatus] = [];
    }

    candidatesByStatus[latestStatus].push({
      name: candidate.name,
      mobile: candidate.mobileNo,
      source: candidate.source,
      qualification: candidate.qualification,
      experience: candidate.experience,
    });
  });

  // Fetch today's joinings created by the employee
  const joinings = await Joining.find({
    createdBy: employeeId,
    createdAt: { $gte: today, $lt: tomorrow },
  }).lean();

  // Calculate call durations for today
  let totalCallDurations = 0;
  let callCount = 0;

  candidates.forEach((candidate) => {
    const todayCalls = candidate.callDurationHistory.filter(
      (call) =>
        call.employee.toString() === employeeId.toString() &&
        new Date(call.date) >= today &&
        new Date(call.date) < tomorrow
    );

    callCount += todayCalls.length;

    todayCalls.forEach((call) => {
      if (call.duration) {
        // Parse duration format like "5m 30s" or "1h 10m"
        const durationParts = call.duration.split(" ");
        let minutes = 0;

        durationParts.forEach((part) => {
          if (part.endsWith("h")) {
            minutes += parseInt(part) * 60;
          } else if (part.endsWith("m")) {
            minutes += parseInt(part);
          } else if (part.endsWith("s")) {
            minutes += parseInt(part) / 60;
          }
        });

        totalCallDurations += minutes;
      }
    });
  });

  const avgCallDuration =
    callCount > 0 ? Math.round(totalCallDurations / callCount) : 0;

  // Return complete work summary
  return {
    lineups: lineups.map((lineup) => ({
      name: lineup.name,
      contact: lineup.contactNumber,
      company: lineup.customCompany || lineup.company,
      process: lineup.customProcess || lineup.process,
      lineupDate: new Date(lineup.lineupDate).toLocaleDateString(),
      interviewDate: new Date(lineup.interviewDate).toLocaleDateString(),
      status: lineup.status,
    })),
    totalLineups: lineups.length,
    candidates: Object.keys(candidatesByStatus).map((status) => ({
      status,
      count: candidatesByStatus[status].length,
      details: candidatesByStatus[status],
    })),
    totalCandidates: candidates.length,
    joinings: joinings.map((joining) => ({
      name: joining.candidateName,
      contact: joining.contactNumber,
      company: joining.company,
      process: joining.process,
      joiningDate: new Date(joining.joiningDate).toLocaleDateString(),
      salary: joining.salary,
      status: joining.status,
      joiningType: joining.joiningType,
    })),
    totalJoinings: joinings.length,
    callStats: {
      totalCalls: callCount,
      totalDuration: `${Math.floor(totalCallDurations / 60)}h ${Math.floor(
        totalCallDurations % 60
      )}m`,
      averageDuration: `${Math.floor(avgCallDuration / 60)}h ${
        avgCallDuration % 60
      }m`,
    },
  };
};

/**
 * Send logout report to admin emails
 * @param {String} employeeId - Employee ID
 * @returns {Promise<void>}
 */
const sendLogoutReport = async (employeeId) => {
  try {
    // Get employee details
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    const employeeDetails = {
      name: employee.name,
      email: employee.email,
      employeeCode: employee.employeeCode,
      mobile: employee.mobile,
    };

    // Current date and time for logout
    const logoutTime = new Date().toLocaleString();

    // Get activity summary
    const activitySummary = await getEmployeeActivities(employeeId);

    // Get candidate work summary
    const candidateWork = await getEmployeeCandidateWork(employeeId);

    // Generate Excel report
    const excelBuffer = await generateActivityExcelReport(
      employeeDetails,
      logoutTime,
      activitySummary,
      candidateWork
    );

    // Create email content with HTML template
    const emailHtml = employeeLogoutReportTemplate(
      employeeDetails,
      logoutTime,
      activitySummary,
      candidateWork
    );

    // Get admin emails from env variables
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const adminEmail = process.env.ADMIN_EMAIL;
    const supervisorEmail = process.env.SUPERVISOR_EMAIL;

    // Construct list of recipients
    const recipients = [superAdminEmail, adminEmail, supervisorEmail].filter(
      (email) => email && email.trim() !== ""
    );

    if (recipients.length === 0) {
      throw new Error("No admin emails configured in environment variables");
    }

    // Send email to all admin recipients with Excel attachment
    for (const recipientEmail of recipients) {
      await sendEmail(
        recipientEmail,
        `Employee Logout Report - ${
          employee.name?.en || employee.name || employee.email
        }`,
        emailHtml,
        true, // isHtml flag
        [
          {
            filename: `${employee.employeeCode || "employee"}_activity_report_${
              new Date().toISOString().split("T")[0]
            }.xlsx`,
            content: excelBuffer,
            contentType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        ]
      );
    }

    console.info(
      `Logout report sent to admins for employee: ${employee.email}`
    );
    return true;
  } catch (error) {
    console.error("Error sending logout report:", error);
    throw error;
  }
};

module.exports = {
  sendLogoutReport,
};
