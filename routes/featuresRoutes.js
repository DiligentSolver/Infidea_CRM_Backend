const express = require("express");
const {
  getFeatures,
  addFeatures,
  updateFeatures,
  deleteFeatureImage,
  uploadFeatureImages,
  deleteFeature,
} = require("../controllers/featuresController");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const cloudinary = require("../utils/cloudinaryConfig");

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`; // Custom Unique ID

    return {
      folder: "feature_images",
      format: "png", // Store as PNG
      public_id: uniqueId, // Custom Naming Format
    };
  },
});

const upload = multer({ storage });

router.get("/features", getFeatures);
router.post("/add/features", addFeatures);
router.patch("/features/:id", updateFeatures);
router.post(
  "/features/:id/upload",
  upload.array("images", 5),
  uploadFeatureImages
);
router.delete("/features/:id/images", deleteFeatureImage);
router.delete("/features/:id", deleteFeature);

module.exports = router;
