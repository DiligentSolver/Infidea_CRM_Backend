const nodemailer = require("nodemailer");

const EMAIL_ID = process.env.EMAIL_ID;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const APP_NAME = process.env.APP_NAME;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_ID,
    pass: EMAIL_PASSWORD, // Use App Password, not your actual password
  },
});

/**
 * Send email with optional HTML content and attachments
 * @param {String} to - Recipient email address
 * @param {String} subject - Email subject
 * @param {String} content - Email content (text or HTML)
 * @param {Boolean} isHtml - Whether content is HTML
 * @param {Array} attachments - Optional array of attachment objects
 * @returns {Promise<void>}
 */
const sendEmail = async (
  to,
  subject,
  content,
  isHtml = false,
  attachments = []
) => {
  try {
    const mailOptions = {
      from: `${APP_NAME}<${EMAIL_ID}>`,
      to,
      subject,
    };

    // Set content as text or HTML based on isHtml flag
    if (isHtml) {
      mailOptions.html = content;
    } else {
      mailOptions.text = content;
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    let info = await transporter.sendMail(mailOptions);

    console.info("Email sent:", info.response);
  } catch (err) {
    console.error("Error sending email:", err);
  }
};

module.exports = sendEmail;
