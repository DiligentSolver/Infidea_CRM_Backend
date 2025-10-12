// Updated emailService.js to use the simple email controller
const { sendSimpleEmail } = require("../controllers/simpleEmailController");

/**
 * Legacy sendEmail function that maintains backward compatibility
 * Now uses the simple email controller for better reliability
 */
const sendEmail = async (to, subject, content, isHtml = false) => {
  try {
    return await sendSimpleEmail(to, subject, content, isHtml);
  } catch (error) {
    console.error("Error in legacy sendEmail function:", error);
    throw error;
  }
};

module.exports = sendEmail;
