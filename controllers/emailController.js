const path = require("path");
const fs = require("fs");
const {
  createGmailTransporter,
  sendEmailWithRetry,
} = require("./simpleEmailController");

// Create temporary directory for file uploads if it doesn't exist
const tempUploadsDir = path.join(__dirname, "../uploads/temp");
if (!fs.existsSync(tempUploadsDir)) {
  fs.mkdirSync(tempUploadsDir, { recursive: true });
}

/**
 * Send an email with attachments
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendEmail = async (req, res) => {
  try {
    const { to, cc, bcc, subject, content, isHtml = true } = req.body;

    // Validate required fields
    if (!to || !subject || !content) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: recipient, subject, and content are required",
      });
    }

    // Create transporter using the simple email controller
    const transporter = createGmailTransporter();

    // Configure email options
    const mailOptions = {
      from: `${process.env.APP_NAME || "CRM System"} <${process.env.EMAIL_ID}>`,
      to,
      subject,
    };

    // Add optional fields if they exist
    if (cc) mailOptions.cc = cc;
    if (bcc) mailOptions.bcc = bcc;

    // Set email content based on isHtml flag
    if (isHtml) {
      mailOptions.html = content;
    } else {
      mailOptions.text = content;
    }

    // Handle file attachments if any
    if (req.files && Object.keys(req.files).length > 0) {
      mailOptions.attachments = [];

      // Process each file attachment
      for (const fieldName in req.files) {
        const fileArray = Array.isArray(req.files[fieldName])
          ? req.files[fieldName]
          : [req.files[fieldName]];

        for (const file of fileArray) {
          // Create attachment object
          mailOptions.attachments.push({
            filename: file.name,
            path: file.tempFilePath || file.path,
            contentType: file.mimetype,
          });
        }
      }
    }

    // Send the email with retry logic
    const info = await sendEmailWithRetry(transporter, mailOptions);

    // Clean up any temporary files
    if (req.files) {
      for (const fieldName in req.files) {
        const fileArray = Array.isArray(req.files[fieldName])
          ? req.files[fieldName]
          : [req.files[fieldName]];

        for (const file of fileArray) {
          if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
            fs.unlinkSync(file.tempFilePath);
          }
        }
      }
    }

    console.log(info);

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
};

/**
 * Send a lineup email with HTML content without attachments
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendLineupEmail = async (req, res) => {
  try {
    const {
      to,
      cc,
      bcc,
      subject,
      lineupData,
      additionalContent = "",
    } = req.body;

    // Validate required fields
    if (!to || !subject || !lineupData) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: recipient, subject, and lineupData are required",
      });
    }

    // Create transporter using the simple email controller
    const transporter = createGmailTransporter();

    // Generate HTML table from lineup data
    const lineupTable = generateLineupHtmlTable(lineupData);

    // Create HTML email content with lineup table
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h2 style="color: #333;">Lineup Details</h2>
        ${additionalContent ? `<div>${additionalContent}</div><br/>` : ""}
        ${lineupTable}
        <p style="margin-top: 20px; color: #666;">
          This email was sent from the CRM system.
        </p>
      </div>
    `;

    // Configure email options
    const mailOptions = {
      from: `${process.env.APP_NAME || "CRM System"} <${process.env.EMAIL_ID}>`,
      to,
      subject,
      html: htmlContent,
    };

    // Add optional fields if they exist
    if (cc) mailOptions.cc = cc;
    if (bcc) mailOptions.bcc = bcc;

    // Send the email with retry logic
    const info = await sendEmailWithRetry(transporter, mailOptions);
    console.log(info);

    return res.status(200).json({
      success: true,
      message: "Lineup email sent successfully",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Error sending lineup email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send lineup email",
      error: error.message,
    });
  }
};

/**
 * Generate HTML table from lineup data
 * @param {Array} lineupData - Array of lineup objects
 * @returns {String} HTML table
 */
function generateLineupHtmlTable(lineupData) {
  // If lineupData is not an array, convert to array with single item
  const dataArray = Array.isArray(lineupData) ? lineupData : [lineupData];

  // Get all unique keys from all objects for table headers
  const allKeys = new Set();
  dataArray.forEach((item) => {
    Object.keys(item).forEach((key) => allKeys.add(key));
  });

  // Filter out any sensitive fields that shouldn't be included
  const excludedFields = ["__v", "password", "createdAt", "updatedAt"];
  const headers = [...allKeys].filter((key) => !excludedFields.includes(key));

  // Generate table HTML
  let tableHtml = `
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
      <thead>
        <tr style="background-color: #f2f2f2;">
  `;

  // Add headers
  headers.forEach((header) => {
    const formattedHeader = header
      .replace(/([A-Z])/g, " $1") // Insert space before capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim();

    tableHtml += `<th style="padding: 10px; text-align: left; border: 1px solid #ddd;">${formattedHeader}</th>`;
  });

  tableHtml += `
        </tr>
      </thead>
      <tbody>
  `;

  // Add rows
  dataArray.forEach((item) => {
    tableHtml += `<tr style="border-bottom: 1px solid #ddd;">`;

    headers.forEach((header) => {
      const value = item[header] !== undefined ? item[header] : "";
      const displayValue =
        typeof value === "object" ? JSON.stringify(value) : value.toString();

      tableHtml += `<td style="padding: 10px; border: 1px solid #ddd;">${displayValue}</td>`;
    });

    tableHtml += `</tr>`;
  });

  tableHtml += `
      </tbody>
    </table>
  `;

  return tableHtml;
}

/**
 * Get email configuration (sender name, email ID)
 * This can be used by the frontend to display the sender info
 */
exports.getEmailConfig = async (req, res) => {
  try {
    const emailConfig = {
      senderName: process.env.APP_NAME || "CRM System",
      senderEmail: process.env.EMAIL_ID,
      maxAttachmentSize: 10 * 1024 * 1024, // 10MB
    };

    return res.status(200).json({
      success: true,
      data: emailConfig,
    });
  } catch (error) {
    console.error("Error getting email configuration:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get email configuration",
      error: error.message,
    });
  }
};
