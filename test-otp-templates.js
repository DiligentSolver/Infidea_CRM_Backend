require("dotenv").config();
const fs = require("fs");
const path = require("path");

// Import the templates
const genericOtpTemplate = require("./utils/emailTemplates/genericOtpTemplate");
const passwordResetOtpTemplate = require("./utils/emailTemplates/passwordResetOtpTemplate");
const loginVerificationOtpTemplate = require("./utils/emailTemplates/loginVerificationOtpTemplate");
const { generateOTP } = require("./utils/otpGenerator");

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, "test-templates");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Generate OTP
const otp = generateOTP();

// Test user data
const userData = {
  name: "Test User",
  email: "test@example.com",
  location: "New York, USA",
  device: "Windows Chrome",
  time: new Date().toLocaleString(),
};

// Test each template and save to file
const templates = [
  {
    name: "generic",
    html: genericOtpTemplate(otp, "Account Verification", 10, userData),
    filename: path.join(outputDir, "generic-otp.html"),
  },
  {
    name: "password-reset",
    html: passwordResetOtpTemplate(otp, 10, userData),
    filename: path.join(outputDir, "password-reset-otp.html"),
  },
  {
    name: "login-verification",
    html: loginVerificationOtpTemplate(otp, 10, userData),
    filename: path.join(outputDir, "login-verification-otp.html"),
  },
];

// Save each template to file
templates.forEach((template) => {
  fs.writeFileSync(template.filename, template.html);
  console.log(`Template '${template.name}' saved to ${template.filename}`);
});

console.log(`All templates generated with OTP: ${otp}`);
console.log("Open the HTML files in a browser to view the templates.");
