/**
 * Login Verification OTP Email Template
 * @param {string} otp - The OTP code
 * @param {number} expiryMinutes - OTP expiry time in minutes
 * @param {object} userData - Optional user data including location if available
 * @returns {string} - HTML template
 */
const loginVerificationOtpTemplate = (
  otp,
  expiryMinutes = 10,
  userData = {}
) => {
  const {
    name = "User",
    location = "Unknown location",
    device = "Unknown device",
    time = new Date().toLocaleString(),
  } = userData;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Verification</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: #20c997;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #888;
      border-top: 1px solid #eee;
    }
    .otp-box {
      background: #e6f8f3;
      border: 1px solid #b8e6d8;
      border-radius: 8px;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      margin: 30px auto;
      padding: 15px;
      text-align: center;
      width: 200px;
      color: #20c997;
    }
    .info-box {
      background: #fff8e1;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .login-details {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
    }
    .login-details h3 {
      margin-top: 0;
      color: #555;
    }
    .detail-row {
      display: flex;
      margin-bottom: 8px;
    }
    .detail-label {
      font-weight: bold;
      width: 120px;
      color: #666;
    }
    p {
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Login Verification</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      
      <p>We detected a new login attempt to your account. To ensure it's you, please use the following verification code:</p>
      
      <div class="otp-box">
        ${otp}
      </div>
      
      <div class="login-details">
        <h3>Login Details</h3>
        <div class="detail-row">
          <div class="detail-label">Location:</div>
          <div>${location}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Device:</div>
          <div>${device}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Time:</div>
          <div>${time}</div>
        </div>
      </div>
      
      <div class="info-box">
        <p><strong>Important:</strong> This code will expire in ${expiryMinutes} minutes.</p>
        <p>If you did not attempt to login, please ignore this email and consider changing your password immediately.</p>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Infidea CRM. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = loginVerificationOtpTemplate;
