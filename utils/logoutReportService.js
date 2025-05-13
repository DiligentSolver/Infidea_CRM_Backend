const sendEmail = require("./emailService");
const employeeLogoutReportTemplate = require("./emailTemplates/employeeLogoutReportTemplate");
const Activity = require("../models/activityModel");
const Employee = require("../models/employeeModel");
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

    // Generate Excel report
    const excelBuffer = await generateActivityExcelReport(
      employeeDetails,
      logoutTime,
      activitySummary
    );

    // Create email content with HTML template
    const emailHtml = employeeLogoutReportTemplate(
      employeeDetails,
      logoutTime,
      activitySummary
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
