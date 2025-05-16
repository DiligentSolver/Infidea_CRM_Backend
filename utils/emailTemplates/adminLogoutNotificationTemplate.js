const adminLogoutNotificationTemplate = (employeeDetails, logoutTime) => {
  const { name, email, employeeCode, mobile } = employeeDetails;

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
      max-width: 600px;
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
      <h2>Employee Logout Notification</h2>
    </div>
    <div class="content">
      <p>An employee has logged out of the system.</p>
      
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
      
      <p>All active activities for this employee have been closed.</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = adminLogoutNotificationTemplate;
