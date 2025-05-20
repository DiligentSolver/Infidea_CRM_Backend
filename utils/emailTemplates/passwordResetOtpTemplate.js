/**
 * Password Reset OTP Email Template
 * @param {string} otp - The OTP code
 * @param {number} expiryMinutes - OTP expiry time in minutes
 * @param {object} userData - Optional user data
 * @returns {string} - HTML template
 */
const passwordResetOtpTemplate = (otp, expiryMinutes = 10, userData = {}) => {
  const { name = "User" } = userData;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP</title>
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
      background: #ff6b6b;
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
      background: #fff5f5;
      border: 1px solid #ffdddd;
      border-radius: 8px;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      margin: 30px auto;
      padding: 15px;
      text-align: center;
      width: 200px;
      color: #ff6b6b;
    }
    .info-box {
      background: #fff8e1;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .security-info {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 15px;
      margin-top: 30px;
      font-size: 13px;
    }
    p {
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      
      <p>We received a request to reset your password. To proceed with the password reset, please use the following verification code:</p>
      
      <div class="otp-box">
        ${otp}
      </div>
      
      <div class="info-box">
        <p><strong>Important:</strong> This code will expire in ${expiryMinutes} minutes.</p>
        <p>If you did not request a password reset, please ignore this email or contact support immediately as your account may be at risk.</p>
      </div>
      
      <div class="security-info">
        <p><strong>Security Tips:</strong></p>
        <ul>
          <li>Never share your password or OTP with anyone</li>
          <li>Make sure your new password is strong and unique</li>
          <li>Consider enabling two-factor authentication for added security</li>
        </ul>
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

module.exports = passwordResetOtpTemplate;
