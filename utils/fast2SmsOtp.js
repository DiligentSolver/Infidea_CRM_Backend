const axios = require("axios");

exports.sendFastOTP = async (mobile, otp) => {
  try {
    const apiKey = process.env.FAST2SMS_API_KEY;

    const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      params: {
        authorization: apiKey,
        variables_values: otp,
        route: "otp",
        numbers: mobile,
      },
      headers: {
        "cache-control": "no-cache",
      },
    });

    console.info(response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    throw error;
  }
};
