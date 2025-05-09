const { uploadFile } = require("./utils/uploadService");
const path = require("path");

// Path to test-image.jpg in root directory
const filePath = path.join(__dirname, "test-image.jpg");

// Define S3 file key (path inside bucket)
const fileKey = "uploads/test-image.jpg"; // You can change this

// Upload File
uploadFile(filePath, fileKey);
