const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

// Import models
const Employee = require("../models/employeeModel");
const Activity = require("../models/activityModel");
const Lineup = require("../models/lineupModel");
const Joining = require("../models/joiningModel");
const Candidate = require("../models/candidateModel");

// Configure email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_ID,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Format minutes into hours and minutes string
 * @param {Number} totalMinutes - Total minutes to format
 * @returns {String} - Formatted time string (e.g., "8h 30m" or "45m")
 */
const formatTimeString = (totalMinutes) => {
  if (isNaN(totalMinutes) || totalMinutes === 0) return "0h 0m";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  if (hours === 0) {
    return `0h ${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h 0m`;
  } else {
    return `${hours}h ${minutes}m`;
  }
};

/**
 * Calculate the total working time of an employee for a given date
 * @param {Object} employee - Employee object
 * @param {Date} date - Date to calculate working time for
 * @returns {Object} - Total working time in minutes and formatted string
 */
const calculateTotalWorkingTime = async (employee, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all activities for the employee on the given date
  const activities = await Activity.find({
    employeeId: employee._id,
    startTime: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ startTime: 1 });

  if (activities.length === 0) {
    return { minutes: 0, formatted: "0h 0m" };
  }

  let totalMinutes = 0;
  for (const activity of activities) {
    const start = new Date(activity.startTime);
    // Use endTime if available, otherwise use the end of day
    const end = activity.endTime ? new Date(activity.endTime) : endOfDay;

    // Calculate duration in minutes
    const durationMinutes = Math.floor((end - start) / (1000 * 60));
    totalMinutes += durationMinutes;
  }

  return {
    minutes: totalMinutes,
    formatted: formatTimeString(totalMinutes),
  };
};

/**
 * Get the first and last activity of the day for login/logout times
 * @param {Object} employee - Employee object
 * @param {Date} date - Date to get activities for
 * @returns {Object} - Login and logout times
 */
const getLoginLogoutTimes = async (employee, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all activities for the employee on the given date
  const activities = await Activity.find({
    employeeId: employee._id,
    startTime: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ startTime: 1 });

  if (activities.length === 0) {
    return {
      loginTime: null,
      logoutTime: null,
    };
  }

  // First activity start time is login time
  const loginTime = activities[0].startTime;

  // Last activity end time is logout time
  // If the last activity doesn't have an end time, use the current time
  let logoutTime = null;
  const lastActivity = activities[activities.length - 1];

  if (lastActivity.endTime) {
    logoutTime = lastActivity.endTime;
  } else if (date.toDateString() !== new Date().toDateString()) {
    // If it's not today, use end of day
    logoutTime = endOfDay;
  }

  return {
    loginTime,
    logoutTime,
  };
};

/**
 * Count calls for an employee on a given date
 * @param {Object} employee - Employee object
 * @param {Date} date - Date to count calls for
 * @returns {Object} - Call statistics
 */
const getCallStatistics = async (employee, date) => {
  // This is a placeholder for actual call tracking logic
  // Replace with actual implementation based on your call tracking system

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Example logic - you would replace this with your actual call tracking logic
  // For example, if you have a calls collection, you would query it here
  return {
    totalCalls: 0, // Replace with actual call count
    totalDuration: "0h 0m", // Replace with actual call duration
    averageDuration: "0h 0m", // Replace with actual average call duration
  };
};

/**
 * Get candidates, lineups, and joinings created by an employee on a given date
 * @param {Object} employee - Employee object
 * @param {Date} date - Date to get counts for
 * @returns {Object} - Counts of candidates, lineups, and joinings
 */
const getWorkSummary = async (employee, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Count lineups created by the employee on the given date
  const lineups = await Lineup.find({
    createdBy: employee._id,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  // Count joinings created by the employee on the given date
  const joinings = await Joining.find({
    createdBy: employee._id,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  // Count candidates created by the employee on the given date
  const candidates = await Candidate.find({
    createdBy: employee._id,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  // Calculate walking count (you may need to adjust based on your data model)
  const walkins = 0; // Replace with actual walking count logic

  return {
    totalLineups: lineups.length,
    lineups: lineups,
    totalCandidates: candidates.length,
    candidates: candidates,
    totalJoinings: joinings.length,
    joinings: joinings,
    walkins: walkins,
  };
};

/**
 * Generate employee report data for a specific date
 * @param {Date} date - Date to generate report for
 * @returns {Array} - Array of employee report data
 */
const generateEmployeeReportData = async (date) => {
  // Get all active employees
  const employees = await Employee.find({ status: "Active" });
  const reportData = [];

  for (const employee of employees) {
    const { loginTime, logoutTime } = await getLoginLogoutTimes(employee, date);

    // Skip employees who didn't log in on this date
    if (!loginTime) {
      continue;
    }

    const workingTime = await calculateTotalWorkingTime(employee, date);
    const workSummary = await getWorkSummary(employee, date);
    const callStats = await getCallStatistics(employee, date);

    reportData.push({
      employee: {
        id: employee.employeeCode,
        name: employee.name?.en || employee.name,
        email: employee.email,
        role: employee.role,
      },
      attendance: {
        loginTime,
        logoutTime,
        totalWorkingTime: workingTime.formatted,
      },
      workSummary: {
        totalLineups: workSummary.totalLineups,
        totalCandidates: workSummary.totalCandidates,
        totalJoinings: workSummary.totalJoinings,
        walkins: workSummary.walkins,
      },
      callStats: {
        totalCalls: callStats.totalCalls,
        totalDuration: callStats.totalDuration,
        averageDuration: callStats.averageDuration,
      },
      lineups: workSummary.lineups,
      joinings: workSummary.joinings,
    });
  }

  return reportData;
};

/**
 * Generate Excel file with employee report data
 * @param {Array} reportData - Array of employee report data
 * @param {Date} date - Date of the report
 * @returns {String} - Path to the generated Excel file
 */
const generateExcelReport = async (reportData, date) => {
  const workbook = new ExcelJS.Workbook();

  // Add employee summary worksheet
  const summarySheet = workbook.addWorksheet("Employee Summary");

  // Set the columns for employee summary
  summarySheet.columns = [
    { header: "Employee ID", key: "id", width: 15 },
    { header: "Name", key: "name", width: 25 },
    { header: "Login Time", key: "loginTime", width: 20 },
    { header: "Logout Time", key: "logoutTime", width: 20 },
    { header: "Total Working Time", key: "workingTime", width: 20 },
    { header: "Total Lineups", key: "lineups", width: 15 },
    { header: "Total Candidates", key: "candidates", width: 15 },
    { header: "Total Joinings", key: "joinings", width: 15 },
    { header: "Walkins", key: "walkins", width: 15 },
    { header: "Total Calls", key: "calls", width: 15 },
    { header: "Call Duration", key: "callDuration", width: 20 },
    { header: "Avg Call Duration", key: "avgCallDuration", width: 20 },
  ];

  // Format header row
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  // Apply styling to all columns
  summarySheet.columns.forEach((column) => {
    column.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Add data to the employee summary worksheet
  reportData.forEach((data) => {
    summarySheet.addRow({
      id: data.employee.id,
      name: data.employee.name,
      loginTime: data.attendance.loginTime
        ? moment(data.attendance.loginTime).format("MM/DD/YYYY, h:mm:ss A")
        : "N/A",
      logoutTime: data.attendance.logoutTime
        ? moment(data.attendance.logoutTime).format("MM/DD/YYYY, h:mm:ss A")
        : "N/A",
      workingTime: data.attendance.totalWorkingTime,
      lineups: data.workSummary.totalLineups,
      candidates: data.workSummary.totalCandidates,
      joinings: data.workSummary.totalJoinings,
      walkins: data.workSummary.walkins,
      calls: data.callStats.totalCalls,
      callDuration: data.callStats.totalDuration,
      avgCallDuration: data.callStats.averageDuration,
    });
  });

  // Add lineups worksheet if there are any lineups
  const hasLineups = reportData.some(
    (data) => data.lineups && data.lineups.length > 0
  );
  if (hasLineups) {
    const lineupSheet = workbook.addWorksheet("Lineups");

    // Set the columns for lineups
    lineupSheet.columns = [
      { header: "Employee ID", key: "employeeId", width: 15 },
      { header: "Employee Name", key: "employeeName", width: 25 },
      { header: "Candidate Name", key: "name", width: 25 },
      { header: "Contact Number", key: "contactNumber", width: 20 },
      { header: "Company", key: "company", width: 25 },
      { header: "Process", key: "process", width: 25 },
      { header: "Lineup Date", key: "lineupDate", width: 20 },
      { header: "Interview Date", key: "interviewDate", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Remarks", key: "remarks", width: 30 },
    ];

    // Format header row
    lineupSheet.getRow(1).font = { bold: true };
    lineupSheet.getRow(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Apply styling to all columns
    lineupSheet.columns.forEach((column) => {
      column.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Add lineup data
    reportData.forEach((data) => {
      if (data.lineups && data.lineups.length > 0) {
        data.lineups.forEach((lineup) => {
          lineupSheet.addRow({
            employeeId: data.employee.id,
            employeeName: data.employee.name,
            name: lineup.name,
            contactNumber: lineup.contactNumber,
            company: lineup.customCompany || lineup.company,
            process: lineup.customProcess || lineup.process,
            lineupDate: moment(lineup.lineupDate).format("MM/DD/YYYY"),
            interviewDate: moment(lineup.interviewDate).format("MM/DD/YYYY"),
            status: lineup.status,
            remarks: lineup.remarks || "",
          });
        });
      }
    });
  }

  // Add joinings worksheet if there are any joinings
  const hasJoinings = reportData.some(
    (data) => data.joinings && data.joinings.length > 0
  );
  if (hasJoinings) {
    const joiningSheet = workbook.addWorksheet("Joinings");

    // Set the columns for joinings
    joiningSheet.columns = [
      { header: "Employee ID", key: "employeeId", width: 15 },
      { header: "Employee Name", key: "employeeName", width: 25 },
      { header: "Candidate Name", key: "candidateName", width: 25 },
      { header: "Contact Number", key: "contactNumber", width: 20 },
      { header: "Company", key: "company", width: 25 },
      { header: "Process", key: "process", width: 25 },
      { header: "Joining Type", key: "joiningType", width: 20 },
      { header: "Salary", key: "salary", width: 15 },
      { header: "Joining Date", key: "joiningDate", width: 20 },
      { header: "Status", key: "status", width: 25 },
      { header: "Remarks", key: "remarks", width: 30 },
    ];

    // Format header row
    joiningSheet.getRow(1).font = { bold: true };
    joiningSheet.getRow(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Apply styling to all columns
    joiningSheet.columns.forEach((column) => {
      column.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Add joining data
    reportData.forEach((data) => {
      if (data.joinings && data.joinings.length > 0) {
        data.joinings.forEach((joining) => {
          joiningSheet.addRow({
            employeeId: data.employee.id,
            employeeName: data.employee.name,
            candidateName: joining.candidateName,
            contactNumber: joining.contactNumber,
            company: joining.company,
            process: joining.process,
            joiningType: joining.joiningType,
            salary: joining.salary || "N/A",
            joiningDate: moment(joining.joiningDate).format("MM/DD/YYYY"),
            status: joining.status,
            remarks: joining.remarks || "",
          });
        });
      }
    });
  }

  // Create uploads/reports directory if it doesn't exist
  const reportDir = path.join(__dirname, "../uploads/reports");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Save the workbook
  const formattedDate = moment(date).format("YYYY-MM-DD");
  const filePath = path.join(
    reportDir,
    `Daily_Employee_Report_${formattedDate}.xlsx`
  );

  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

/**
 * Send daily report email to administrators
 * @param {String} filePath - Path to the Excel report file
 * @param {Date} date - Date of the report
 */
const sendDailyReportEmail = async (filePath, date) => {
  try {
    const transporter = createTransporter();
    const formattedDate = moment(date).format("MMMM D, YYYY");

    // Get admin emails from environment variables
    const adminEmails = [
      process.env.SUPER_ADMIN_EMAIL,
      process.env.ADMIN_EMAIL,
      process.env.SUPERVISOR_EMAIL,
    ].filter((email) => email && email.trim() !== "");

    if (adminEmails.length === 0) {
      console.error("No admin emails configured. Cannot send report.");
      return;
    }

    // Create email content
    const mailOptions = {
      from: `${process.env.APP_NAME}<${process.env.EMAIL_ID}>`,
      to: adminEmails.join(", "),
      subject: `Daily Employee Report - ${formattedDate}`,
      html: `
        <h1>Daily Employee Report - ${formattedDate}</h1>
        <p>Please find attached the daily employee activity report for ${formattedDate}.</p>
        <p>This report includes:</p>
        <ul>
          <li>Employee login/logout times and total working hours</li>
          <li>Number of lineups, candidates, and joinings created</li>
          <li>Call statistics</li>
        </ul>
        <p>If there were any lineups or joinings today, they are included in separate sheets in the attached Excel file.</p>
        <p>This is an automated report. Please do not reply to this email.</p>
      `,
      attachments: [
        {
          filename: path.basename(filePath),
          path: filePath,
        },
      ],
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Daily report email sent: ${info.response}`);

    return true;
  } catch (error) {
    console.error("Error sending daily report email:", error);
    return false;
  }
};

/**
 * Generate and send daily report for a specific date
 * @param {Date} date - Date to generate report for (defaults to today)
 */
const generateAndSendDailyReport = async (date = new Date()) => {
  try {
    console.log(`Generating daily report for ${date.toDateString()}`);

    // Generate report data
    const reportData = await generateEmployeeReportData(date);

    if (reportData.length === 0) {
      console.log("No employee data to report for this date");
      return;
    }

    // Generate Excel report
    const filePath = await generateExcelReport(reportData, date);

    // Send email with the report
    await sendDailyReportEmail(filePath, date);

    console.log(
      `Daily report generated and sent successfully for ${date.toDateString()}`
    );
  } catch (error) {
    console.error("Error generating and sending daily report:", error);
  }
};

// Schedule daily report at 8:00 PM Indian time
const scheduleDailyReport = () => {
  // Convert 8:00 PM IST to server's timezone for cron
  const serverTime = moment()
    .tz("Asia/Kolkata")
    .set({ hour: 20, minute: 0, second: 0 })
    .local();
  const cronHour = serverTime.hour();
  const cronMinute = serverTime.minute();

  // Schedule the cron job
  cron.schedule(`${cronMinute} ${cronHour} * * *`, async () => {
    await generateAndSendDailyReport();
  });

  console.log(
    `Daily report scheduled to run at ${cronHour}:${cronMinute} (server time), which is 8:00 PM IST`
  );
};

module.exports = {
  generateAndSendDailyReport,
  scheduleDailyReport,
};
