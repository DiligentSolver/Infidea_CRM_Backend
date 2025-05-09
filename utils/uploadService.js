const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
require("dotenv").config();
const fs = require("fs");

// Initialize S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file to S3
 * @param {string} filePath - Local path to the file
 * @param {string} fileKey - S3 key (path in bucket)
 */
const uploadFile = async (filePath, fileKey) => {
  try {
    const fileContent = fs.readFileSync(filePath);

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey, // e.g., "uploads/test-image.jpg"
      Body: fileContent,
      ContentType: "image/jpeg", // Change based on file type
    };

    await s3.send(new PutObjectCommand(uploadParams));
    console.log(`✅ File uploaded successfully: ${fileKey}`);
  } catch (error) {
    console.error("❌ Error uploading file:", error);
  }
};

/**
 * Upload a profile image to S3
 * @param {string} filePath - Local path to the file
 * @param {string} userId - User ID to create unique file key
 * @param {string} mimeType - File mime type
 * @returns {Promise<string>} - Returns the URL of the uploaded file
 */
const uploadProfileImage = async (filePath, userId, mimeType) => {
  try {
    // Delete any existing profile image first
    await deleteProfileImage(userId);

    const fileContent = fs.readFileSync(filePath);
    const fileExtension = mimeType === "image/png" ? "png" : "jpg";
    const fileKey = `profile-images/${userId}.${fileExtension}`;

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: fileContent,
      ContentType: mimeType,
    };

    await s3.send(new PutObjectCommand(uploadParams));

    // Construct the S3 URL
    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    console.log(`✅ Profile image uploaded successfully: ${fileKey}`);
    return imageUrl;
  } catch (error) {
    console.error("❌ Error uploading profile image:", error);
    throw error;
  }
};

/**
 * Delete a profile image from S3
 * @param {string} userId - User ID to identify the file
 * @returns {Promise<void>}
 */
const deleteProfileImage = async (userId) => {
  try {
    // Try to delete both possible extensions
    const extensions = ["jpg", "png"];

    for (const ext of extensions) {
      const fileKey = `profile-images/${userId}.${ext}`;
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey,
          })
        );
        console.log(`✅ Profile image deleted successfully: ${fileKey}`);
      } catch (error) {
        // Ignore errors if file doesn't exist
        if (error.name !== "NoSuchKey") {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error("❌ Error deleting profile image:", error);
    throw error;
  }
};

/**
 * Upload a resume to S3
 * @param {string} filePath - Local path to the file
 * @param {string} userId - User ID to create unique file key
 * @param {string} mimeType - File mime type
 * @returns {Promise<string>} - Returns the URL of the uploaded file
 */
const uploadResume = async (filePath, userId, mimeType) => {
  try {
    // Delete any existing resume first
    await deleteResume(userId);

    const fileContent = fs.readFileSync(filePath);

    // Determine file extension based on mime type
    let fileExtension;
    switch (mimeType) {
      case "application/pdf":
        fileExtension = "pdf";
        break;
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        fileExtension = "docx";
        break;
      case "image/jpeg":
      case "image/jpg":
        fileExtension = "jpg";
        break;
      case "image/png":
        fileExtension = "png";
        break;
      default:
        throw new Error("Unsupported file type");
    }

    const fileKey = `resumes/${userId}.${fileExtension}`;

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: fileContent,
      ContentType: mimeType,
    };

    await s3.send(new PutObjectCommand(uploadParams));

    // Construct the S3 URL
    const resumeUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    console.log(`✅ Resume uploaded successfully: ${fileKey}`);
    return resumeUrl;
  } catch (error) {
    console.error("❌ Error uploading resume:", error);
    throw error;
  }
};

/**
 * Delete a resume from S3
 * @param {string} userId - User ID to identify the file
 * @returns {Promise<void>}
 */
const deleteResume = async (userId) => {
  try {
    // Try to delete all possible extensions
    const extensions = ["pdf", "docx", "jpg", "png"];

    for (const ext of extensions) {
      const fileKey = `resumes/${userId}.${ext}`;
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey,
          })
        );
        console.log(`✅ Resume deleted successfully: ${fileKey}`);
      } catch (error) {
        // Ignore errors if file doesn't exist
        if (error.name !== "NoSuchKey") {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error("❌ Error deleting resume:", error);
    throw error;
  }
};

/**
 * Generate a presigned URL for a profile image
 * @param {string} userId - User ID to identify the file
 * @returns {Promise<string>} - Returns the presigned URL
 */
const getProfileImagePresignedUrl = async (userId) => {
  try {
    // Try both possible extensions
    const extensions = ["jpg", "png"];
    let fileKey = null;

    // Find which extension exists
    for (const ext of extensions) {
      const key = `profile-images/${userId}.${ext}`;
      try {
        await s3.send(
          new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
          })
        );
        fileKey = key;
        break;
      } catch (error) {
        // Continue to next extension if file doesn't exist
        continue;
      }
    }

    if (!fileKey) {
      throw new Error("Profile image not found");
    }

    // Generate presigned URL
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL expires in 1 hour
    return presignedUrl;
  } catch (error) {
    console.error("❌ Error generating presigned URL:", error);
    throw error;
  }
};

/**
 * Generate a presigned URL for a resume
 * @param {string} userId - User ID to identify the file
 * @returns {Promise<string>} - Returns the presigned URL
 */
const getResumePresignedUrl = async (userId) => {
  try {
    // Try all possible extensions
    const extensions = ["pdf", "docx", "jpg", "png"];
    let fileKey = null;

    // Find which extension exists
    for (const ext of extensions) {
      const key = `resumes/${userId}.${ext}`;
      try {
        await s3.send(
          new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
          })
        );
        fileKey = key;
        break;
      } catch (error) {
        // Continue to next extension if file doesn't exist
        continue;
      }
    }

    if (!fileKey) {
      throw new Error("Resume not found");
    }

    // Generate presigned URL
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL expires in 1 hour
    return presignedUrl;
  } catch (error) {
    console.error("❌ Error generating presigned URL:", error);
    throw error;
  }
};

module.exports = {
  uploadFile,
  uploadProfileImage,
  deleteProfileImage,
  uploadResume,
  deleteResume,
  getProfileImagePresignedUrl,
  getResumePresignedUrl,
};
