const { client, connectRedis } = require("./redisClient");

const cleanupAttemptKeys = async (identifier) => {
  const keysToRemove = [
    `Employee_email_otp_send_attempts:${identifier}`,
    `Employee_email_otp_resend_attempts:${identifier}`,
    `Employee_email_verification_attempts:${identifier}`,
    `Employee_login_attempts:${identifier}`,
    `Forgot_Employee_password_attempts:${identifier}`,
    `Reset_Employee_password_attempts:${identifier}`,
    `Employee_email_verify_otp_attempts:${identifier}`,
    `Employee_verify_email_otp_resend_attempts:${identifier}`,
    `Employee_email_verification_attempts:${identifier}`,
    `EmployeeEmailVerificationOTP:${identifier}`,
    `resetEmployeePasswordOTP:${identifier}`,
    `EmployeeRegisterOTP:${identifier}`,
  ];

  try {
    connectRedis();

    await Promise.all(keysToRemove.map((key) => client.del(key)));
    console.info(`Cleaned up Attempt keys for ${identifier}`);
  } catch (error) {
    console.error(`Error cleaning up Attempt keys:`, error);
  }
};

module.exports = { cleanupAttemptKeys };
