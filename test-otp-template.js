require("dotenv").config();
const fs = require("fs");
const genericOtpTemplate = require("./utils/emailTemplates/genericOtpTemplate");
const sendEmail = require("./utils/emailService");
const { generateOTP } = require("./utils/otpGenerator");

// Generate an OTP
const otp = generateOTP();

// Test user data
const userData = {
  name: "Test User",
  email: "test@example.com",
};

// Create the email template
const emailHtml = genericOtpTemplate(otp, "Account Verification", 10, userData);

// Save the HTML to a file for easy viewing
fs.writeFileSync("test-otp-template.html", emailHtml);
console.log(
  "Template saved to test-otp-template.html. Open in a browser to view."
);

// Optional: Uncomment to test sending a real email
// Note: Make sure your environment variables are set up correctly
/*
const testEmail = 'your-test-email@example.com'; // Replace with your test email
sendEmail(testEmail, 'Test OTP Email', emailHtml, true)
  .then(() => console.log('Test email sent successfully!'))
  .catch(err => console.error('Failed to send test email:', err));
*/

// Output OTP for reference
console.log("Generated OTP:", otp);
