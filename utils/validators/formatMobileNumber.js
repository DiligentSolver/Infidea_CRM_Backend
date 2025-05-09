// Add this utility function at the beginning of the file
const formatAndValidateMobile = (mobileNumber) => {
  if (!mobileNumber) {
    throw new Error("Mobile number is required");
  }

  // Remove all spaces and non-numeric characters except +
  let cleanMobile = mobileNumber.toString().replace(/\s+/g, "").trim();

  // Check if number already has +91 prefix
  if (!cleanMobile.startsWith("+91")) {
    // Remove any other country code if exists (any + followed by numbers)
    cleanMobile = cleanMobile.replace(/^\+\d+/, "");

    // Remove leading zeros
    cleanMobile = cleanMobile.replace(/^0+/, "");

    // Add +91 prefix
    cleanMobile = "+91" + cleanMobile;
  }

  // Extract the number part after +91
  const numberPart = cleanMobile.slice(3);

  // Check if it's exactly 10 digits
  if (!/^\d{10}$/.test(numberPart)) {
    return new Error("Mobile number must be exactly 10 digits");
  }

  return cleanMobile;
};

module.exports = formatAndValidateMobile;
