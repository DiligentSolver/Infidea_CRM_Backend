const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

exports.sendOTP = async (mobile, otp) => {
  try {
    console.info(`Sending OTP via Twilio: ${otp} to ${mobile}`);
    const message = await client.messages.create({
      body: `# Your OTP is ${otp}`,
      from: twilioPhoneNumber,
      to: mobile, // Ensure this number is in E.164 format (e.g., +1234567890)
    });
    return message.sid;
  } catch (err) {
    console.info(`Err: OTP not sent ${otp} to ${mobile}`);
    throw new Error("Failed to send OTP via Twilio");
  }
};
