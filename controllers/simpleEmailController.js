const nodemailer = require("nodemailer");
require("dotenv").config({ path: "./Infidea_CRM_Backend.env" });

/**
 * Simple and reliable email controller specifically designed for Gmail SMTP
 * This controller focuses on login emails and other critical notifications
 */

// Create a simple Gmail SMTP transporter with optimized settings
const createGmailTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use SSL
    auth: {
      user: process.env.EMAIL_ID,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Optimized settings for Gmail
    pool: true,
    maxConnections: 2,
    maxMessages: 10,
    connectionTimeout: 30000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    tls: {
      minVersion: "TLSv1.2",
    },
  });
};

// Retry logic for email sending
const sendEmailWithRetry = async (transporter, mailOptions, retryCount = 0) => {
  const maxRetries = 3;

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(
      `❌ Email send failed (attempt ${retryCount + 1}/${maxRetries + 1}):`,
      error.message
    );

    // Retry logic for specific errors
    if (
      retryCount < maxRetries &&
      (error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.message.includes("socket close") ||
        error.message.includes("Greeting never received") ||
        error.message.includes("Unexpected socket close") ||
        error.code === "EAUTH")
    ) {
      console.log(
        `🔄 Retrying email send in ${(retryCount + 1) * 2} seconds...`
      );
      await new Promise((resolve) =>
        setTimeout(resolve, (retryCount + 1) * 2000)
      );
      return sendEmailWithRetry(transporter, mailOptions, retryCount + 1);
    }

    // If all retries failed, throw the error
    throw error;
  }
};

/**
 * Send login verification OTP to admin emails
 * @param {Object} employee - Employee details
 * @param {String} otp - OTP code
 * @param {String} ipAddress - IP address (optional)
 * @returns {Boolean} - Success status
 */
const sendLoginVerificationEmail = async (employee, otp, ipAddress = null) => {
  try {
    const transporter = createGmailTransporter();

    // Get admin emails
    const adminEmails = [
      process.env.SUPER_ADMIN_EMAIL,
      process.env.ADMIN_EMAIL,
      process.env.SUPERVISOR_EMAIL,
    ].filter((email) => email && email.trim() !== "");

    if (adminEmails.length === 0) {
      throw new Error("No admin emails configured");
    }

    const currentTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Create simple HTML email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #dc3545; margin: 0 0 15px 0;">🔐 Login Verification Required</h2>
          <p style="margin: 0; color: #6c757d;">An employee is attempting to log in and requires verification.</p>
        </div>
        
        <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px;">
          <h3 style="color: #495057; margin-top: 0;">Employee Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${
                employee.name?.en || employee.name || "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${
                employee.email
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Employee ID:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${
                employee.employeeCode || employee.employeeId || "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Mobile:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${
                employee.mobile || "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Login Time:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${currentTime} IST</td>
            </tr>
            ${
              ipAddress
                ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>IP Address:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ipAddress}</td>
            </tr>
            `
                : ""
            }
          </table>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #856404; margin-top: 0;">🔑 Verification Code</h3>
          <div style="background-color: #fff; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; text-align: center; margin: 10px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #dc3545; letter-spacing: 5px;">${otp}</span>
          </div>
          <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
            <strong>Please provide this code to the employee to complete their login.</strong>
          </p>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #0c5460; font-size: 14px;">
            <strong>⚠️ Security Notice:</strong> This code expires in ${
              process.env.OTP_EXPIRY || 10
            } minutes. 
            Only share this code with the verified employee.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; font-size: 12px; margin: 0;">
            This is an automated message from ${
              process.env.APP_NAME || "CRM System"
            }.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    // Send email to each admin individually
    let successCount = 0;
    for (const adminEmail of adminEmails) {
      try {
        const mailOptions = {
          from: `"${process.env.APP_NAME || "CRM System"}" <${
            process.env.EMAIL_ID
          }>`,
          to: adminEmail,
          subject: `Login Verification Required - ${
            employee.name?.en || employee.name || employee.email
          }`,
          html: emailHtml,
        };

        await sendEmailWithRetry(transporter, mailOptions);
        successCount++;
        console.log(`✅ Login verification email sent to: ${adminEmail}`);
      } catch (error) {
        console.error(
          `❌ Failed to send login email to ${adminEmail}:`,
          error.message
        );
      }
    }

    if (successCount > 0) {
      console.log(
        `✅ Login verification emails sent to ${successCount}/${adminEmails.length} admins`
      );
      return true;
    } else {
      throw new Error("Failed to send login verification emails to any admin");
    }
  } catch (error) {
    console.error("❌ Error in sendLoginVerificationEmail:", error);
    throw error;
  }
};

/**
 * Send logout notification to admin emails
 * @param {Object} employee - Employee details
 * @param {String} ipAddress - IP address (optional)
 * @returns {Boolean} - Success status
 */
const sendLogoutNotificationEmail = async (employee, ipAddress = null) => {
  try {
    const transporter = createGmailTransporter();

    // Get admin emails
    const adminEmails = [
      process.env.SUPER_ADMIN_EMAIL,
      process.env.ADMIN_EMAIL,
      process.env.SUPERVISOR_EMAIL,
    ].filter((email) => email && email.trim() !== "");

    if (adminEmails.length === 0) {
      throw new Error("No admin emails configured");
    }

    const logoutTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Create simple HTML email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #155724; margin: 0 0 15px 0;">👋 Employee Logout Notification</h2>
          <p style="margin: 0; color: #6c757d;">An employee has successfully logged out of the system.</p>
        </div>
        
        <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px;">
          <h3 style="color: #495057; margin-top: 0;">Employee Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${
                employee.name?.en || employee.name || "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${
                employee.email
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Employee ID:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${
                employee.employeeCode || employee.employeeId || "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Logout Time:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${logoutTime} IST</td>
            </tr>
            ${
              ipAddress
                ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>IP Address:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ipAddress}</td>
            </tr>
            `
                : ""
            }
          </table>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #0c5460; font-size: 14px;">
            <strong>ℹ️ Information:</strong> All active activities for this employee have been closed automatically.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; font-size: 12px; margin: 0;">
            This is an automated message from ${
              process.env.APP_NAME || "CRM System"
            }.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    // Send email to each admin individually
    let successCount = 0;
    for (const adminEmail of adminEmails) {
      try {
        const mailOptions = {
          from: `"${process.env.APP_NAME || "CRM System"}" <${
            process.env.EMAIL_ID
          }>`,
          to: adminEmail,
          subject: `Logout Notification - ${
            employee.name?.en || employee.name || employee.email
          }`,
          html: emailHtml,
        };

        await sendEmailWithRetry(transporter, mailOptions);
        successCount++;
        console.log(`✅ Logout notification email sent to: ${adminEmail}`);
      } catch (error) {
        console.error(
          `❌ Failed to send logout email to ${adminEmail}:`,
          error.message
        );
      }
    }

    if (successCount > 0) {
      console.log(
        `✅ Logout notification emails sent to ${successCount}/${adminEmails.length} admins`
      );
      return true;
    } else {
      throw new Error("Failed to send logout notification emails to any admin");
    }
  } catch (error) {
    console.error("❌ Error in sendLogoutNotificationEmail:", error);
    throw error;
  }
};

/**
 * Send simple text email
 * @param {String} to - Recipient email
 * @param {String} subject - Email subject
 * @param {String} content - Email content
 * @param {Boolean} isHtml - Whether content is HTML
 * @returns {Boolean} - Success status
 */
const sendSimpleEmail = async (to, subject, content, isHtml = false) => {
  try {
    const transporter = createGmailTransporter();

    const mailOptions = {
      from: `"${process.env.APP_NAME || "CRM System"}" <${
        process.env.EMAIL_ID
      }>`,
      to,
      subject,
    };

    if (isHtml) {
      mailOptions.html = content;
    } else {
      mailOptions.text = content;
    }

    await sendEmailWithRetry(transporter, mailOptions);
    console.log(`✅ Simple email sent to: ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send simple email to ${to}:`, error.message);
    throw error;
  }
};

module.exports = {
  sendLoginVerificationEmail,
  sendLogoutNotificationEmail,
  sendSimpleEmail,
  createGmailTransporter,
  sendEmailWithRetry,
};
