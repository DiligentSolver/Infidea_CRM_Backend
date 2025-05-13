const adminLoginOtpTemplate = (employeeDetails, otp, loginTime) => {
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
      background-color: #4a69bd;
      color: white;
      padding: 15px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      padding: 20px;
    }
    .otp-box {
      background-color: #f8f9fa;
      border: 1px dashed #ddd;
      border-radius: 5px;
      padding: 15px;
      text-align: center;
      margin: 20px 0;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 5px;
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
      <h2>Employee Login Verification</h2>
    </div>
    <div class="content">
      <p>An employee is attempting to log in to the system and requires verification.</p>
      
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
          <div class="detail-label">Login Time:</div>
          <div>${loginTime || "N/A"}</div>
        </div>
      </div>
      
      <p>Please provide the following OTP to the employee to complete their login:</p>
      
      <div class="otp-box">
        ${otp}
      </div>
      
      <p>If you did not expect this login attempt, please contact your IT department immediately.</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = adminLoginOtpTemplate;
