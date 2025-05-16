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

const sendEmail = async (to, subject, content, isHtml = false) => {
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

    let info = await transporter.sendMail(mailOptions);

    console.info("Email sent:", info.response);
  } catch (err) {
    console.error("Error sending email:", err);
  }
};

module.exports = sendEmail;
