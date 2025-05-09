const cloudinary = require("cloudinary").v2;
const { promisify } = require("util");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Promisify the upload and destroy methods
const uploadToCloudinary = promisify(cloudinary.uploader.upload);
const destroyFromCloudinary = promisify(cloudinary.uploader.destroy);

/**
 * Upload an image to Cloudinary
 * @param {Object} fileBuffer - The file buffer to upload
 * @param {String} folderName - The folder to upload to (e.g., 'companys_logos', 'companys_banners')
 * @param {String} publicId - The public ID to use for the image (e.g., jobUniqueId)
 * @returns {Promise<Object>} - The Cloudinary upload result
 */
const uploadImage = async (fileBuffer, folderName, publicId) => {
  try {
    if (!fileBuffer) return null;

    const result = await uploadToCloudinary(fileBuffer, {
      folder: folderName,
      public_id: publicId,
      overwrite: true,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw new Error("Failed to upload image");
  }
};

/**
 * Delete an image from Cloudinary
 * @param {String} publicId - The public ID of the image to delete
 * @returns {Promise<Object>} - The Cloudinary delete result
 */
const deleteImage = async (publicId) => {
  try {
    if (!publicId) return null;

    const result = await destroyFromCloudinary(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw new Error("Failed to delete image");
  }
};

module.exports = {
  uploadImage,
  deleteImage,
};
