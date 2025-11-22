import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ quiet: true }); // Suppress dotenv tips

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate Cloudinary configuration
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

const useCloudinary = cloudinaryConfig.cloud_name && cloudinaryConfig.api_key && cloudinaryConfig.api_secret;

if (!useCloudinary) {
  console.warn("⚠️ WARNING: Cloudinary credentials are missing for profile photos!");
  console.warn("Using local file storage as fallback. Files will be stored in backend/uploads/profile/");
  console.warn("For production, please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file");
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, "../uploads/profile");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("✅ Created profile uploads directory");
  }
} else {
  // Configure Cloudinary
  cloudinary.config(cloudinaryConfig);
  console.log("✅ Cloudinary configured for profile photos");
}

// File filter - only allow image formats
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only JPG, PNG, GIF, and WEBP images are allowed. Received: ${file.mimetype || fileExtension}`), false);
  }
};

// Configure multer storage - use Cloudinary if available, otherwise use disk storage
let storage;
if (useCloudinary) {
  try {
    storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: "project_dashboard/profile_photos",
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto" }
        ],
      },
    });
    console.log("✅ Cloudinary storage configured successfully for profile photos");
  } catch (error) {
    console.error("❌ Error configuring Cloudinary storage:", error);
    throw error;
  }
} else {
  // Fallback to disk storage
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir = path.join(__dirname, "../uploads/profile");
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
    },
  });
  console.log("✅ Local disk storage configured as fallback for profile photos");
}

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for profile photos
  },
});

const router = express.Router();

// Upload profile photo endpoint
router.post("/profile-photo", (req, res, next) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        console.error("❌ Multer error:", err);
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ error: "File upload error", message: err.message, code: err.code });
      }
      // Handle Cloudinary errors
      if (err.message && err.message.includes("cloudinary")) {
        console.error("❌ Cloudinary error:", err);
        return res.status(500).json({ 
          error: "Cloudinary upload failed", 
          message: err.message,
        });
      }
      // Handle other errors
      console.error("❌ Upload middleware error:", err);
      return res.status(500).json({ 
        error: "Upload failed", 
        message: err.message || "Unknown error occurred",
      });
    }
    
    // If no error, proceed with file processing
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Extract URL from uploaded file
      let url;
      if (useCloudinary) {
        // Cloudinary returns file with path/url/secure_url
        url = req.file.path || req.file.url || req.file.secure_url;
      } else {
        // Local storage - return a full URL that can be accessed
        const filename = req.file.filename;
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
        url = `${baseUrl}/uploads/profile/${filename}`;
      }
      
      console.log(`✅ Profile photo uploaded: ${req.file.originalname} -> ${url}`);
      
      res.json({ 
        success: true,
        url: url,
      });
    } catch (error) {
      console.error("=== PROFILE PHOTO UPLOAD ERROR ===");
      console.error("Error:", error);
      
      res.status(500).json({ 
        error: "Failed to process uploaded file", 
        message: error.message || "Unknown error",
      });
    }
  });
});

export default router;

