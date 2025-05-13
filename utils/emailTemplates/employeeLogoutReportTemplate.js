const employeeLogoutReportTemplate = (
  employeeDetails,
  logoutTime,
  activitySummary
) => {
  const { name, email, employeeCode, mobile } = employeeDetails;
  const { totalWorkingTime, activities } = activitySummary;

  // Format activities into HTML rows
  const activityRows = activities
    .map(
      (activity) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${activity.type}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${new Date(
        activity.startTime
      ).toLocaleString()}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${
        activity.endTime ? new Date(activity.endTime).toLocaleString() : "N/A"
      }</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${
        activity.duration || "N/A"
      }</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .header {
      background-color: #e74c3c;
      color: white;
      padding: 15px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      padding: 20px;
    }
    .employee-details {
      background-color: #f2f2f2;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .detail-row {
      display: flex;
      margin-bottom: 8px;
    }
    .detail-label {
      width: 150px;
      font-weight: bold;
    }
    .summary-box {
      background-color: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      margin: 20px 0;
    }
    .activity-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .activity-table th {
      background-color: #f2f2f2;
      padding: 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #777;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Employee Logout Report</h2>
    </div>
    <div class="content">
      <p>An employee has logged out of the system. Here is their daily activity report:</p>
      
      <div class="employee-details">
        <h3>Employee Details:</h3>
        <div class="detail-row">
          <div class="detail-label">Name:</div>
          <div>${name?.en || name || "N/A"}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Employee ID:</div>
          <div>${employeeCode || "N/A"}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Email:</div>
          <div>${email || "N/A"}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Mobile:</div>
          <div>${mobile || "N/A"}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Logout Time:</div>
          <div>${logoutTime || "N/A"}</div>
        </div>
      </div>
      
      <div class="summary-box">
        <h3>Today's Summary:</h3>
        <div class="detail-row">
          <div class="detail-label">Total Working Time:</div>
          <div>${totalWorkingTime || "0 hours"}</div>
        </div>
      </div>
      
      <h3>Activity Details:</h3>
      <table class="activity-table">
        <thead>
          <tr>
            <th>Activity Type</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${
            activityRows.length > 0
              ? activityRows
              : '<tr><td colspan="4" style="padding: 8px; border: 1px solid #ddd; text-align: center;">No activities recorded</td></tr>'
          }
        </tbody>
      </table>
      
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>The report is also attached as an Excel file for your records.</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = employeeLogoutReportTemplate;
