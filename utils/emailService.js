const nodemailer = require("nodemailer");

const EMAIL_ID = process.env.EMAIL_ID;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const APP_NAME = process.env.APP_NAME;

const useService = process.env.EMAIL_SERVICE || "gmail";
const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT
  ? parseInt(process.env.SMTP_PORT, 10)
  : undefined;
const secure = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === "true"
  : undefined; // true for 465, false for others

const transportOptions = host
  ? {
      host,
      port: port ?? 587,
      secure: secure ?? false,
      auth: { user: EMAIL_ID, pass: EMAIL_PASSWORD },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    }
  : {
      service: useService,
      auth: { user: EMAIL_ID, pass: EMAIL_PASSWORD },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    };

const transporter = nodemailer.createTransport(transportOptions);

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
