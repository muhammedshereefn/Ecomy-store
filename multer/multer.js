const multer = require("multer");
const { cloudinary } = require("../cloudinaryConfig");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

let upload;

try {
  // Configure Cloudinary storage
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "products", // The folder name in Cloudinary
      allowed_formats: ["jpeg", "png", "jpg", "webp"], // Allowed file types
    },
  });

  // Set up multer with Cloudinary storage
  upload = multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB file size limit
    },
  });
} catch (error) {
  console.error("Error setting up multer with Cloudinary:", error);
  throw new Error("Failed to configure file upload middleware.");
}

module.exports = { upload };
