import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { verifyToken } from "../controllers/authController.js";
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
  console.warn("⚠️ WARNING: Cloudinary credentials are missing!");
  console.warn("Using local file storage as fallback. Files will be stored in backend/uploads/");
  console.warn("For production, please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file");
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("✅ Created uploads directory");
  }
} else {
  // Configure Cloudinary
  cloudinary.config(cloudinaryConfig);
  console.log("✅ Cloudinary configured");
}

// File filter - only allow PDF and document formats
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only PDF, DOC, and DOCX files are allowed. Received: ${file.mimetype || fileExtension}`), false);
  }
};

// Configure multer storage - use Cloudinary if available, otherwise use disk storage
let storage;
if (useCloudinary) {
  try {
    storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: "project_dashboard",
        allowed_formats: ["pdf", "doc", "docx"], // Only PDF and documents
      },
    });
    console.log("✅ Cloudinary storage configured successfully (PDF & Documents only)");
  } catch (error) {
    console.error("❌ Error configuring Cloudinary storage:", error);
    throw error;
  }
} else {
  // Fallback to disk storage
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir = path.join(__dirname, "../uploads");
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  });
  console.log("✅ Local disk storage configured as fallback (PDF & Documents only)");
}

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const router = express.Router();

// Test endpoint
router.get("/test", (req, res) => {
  res.json({ 
    message: "Upload route is working",
    cloudinary_configured: !!process.env.CLOUDINARY_CLOUD_NAME 
  });
});

// Upload endpoint with proper error handling (requires authentication)
router.post("/", verifyToken, (req, res, next) => {
  console.log("=== UPLOAD REQUEST RECEIVED ===");
  console.log("Request method:", req.method);
  console.log("Request path:", req.path);
  console.log("Request URL:", req.url);
  console.log("Content-Type:", req.headers['content-type']);
  console.log("Content-Length:", req.headers['content-length']);
  console.log("User authenticated:", req.user?.email || "Unknown");
  
  // Use upload.array with error handling
  const uploadHandler = upload.array("files", 5);
  
  uploadHandler(req, res, (err) => {
    if (err) {
      console.error("=== UPLOAD ERROR ===");
      console.error("Error type:", err.constructor.name);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        console.error("❌ Multer error:", err);
        console.error("Error code:", err.code);
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ 
            error: "File too large", 
            message: "Maximum file size is 10MB per file.",
            code: err.code 
          });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({ 
            error: "Too many files", 
            message: "Maximum 5 files allowed per upload.",
            code: err.code 
          });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({ 
            error: "Unexpected file field", 
            message: "Files must be uploaded with field name 'files'.",
            code: err.code 
          });
        }
        return res.status(400).json({ 
          error: "File upload error", 
          message: err.message, 
          code: err.code 
        });
      }
      // Handle Cloudinary errors
      if (err.message && (err.message.includes("cloudinary") || err.message.includes("Cloudinary"))) {
        console.error("❌ Cloudinary error:", err);
        return res.status(500).json({ 
          error: "Cloudinary upload failed", 
          message: err.message,
          details: "Please check your Cloudinary credentials and configuration"
        });
      }
      // Handle file filter errors
      if (err.message && err.message.includes("Invalid file type")) {
        return res.status(400).json({ 
          error: "Invalid file type", 
          message: err.message,
          allowedTypes: ["PDF", "DOC", "DOCX"]
        });
      }
      // Handle other errors
      return res.status(500).json({ 
        error: "Upload failed", 
        message: err.message || "Unknown error occurred",
        errorType: err.constructor.name
      });
    }
    
    // If no error, proceed with file processing
    try {
      console.log("=== PROCESSING UPLOAD ===");
      console.log("Request files count:", req.files ? req.files.length : 0);
      
      if (!req.files || req.files.length === 0) {
        console.log("ERROR: No files received in request");
        return res.status(400).json({ 
          error: "No files uploaded",
          message: "Please select at least one file to upload.",
          hint: "Ensure files are sent with field name 'files' in FormData"
        });
      }
      
      console.log("Files received:", req.files.map(f => ({
        originalname: f.originalname,
        size: f.size,
        mimetype: f.mimetype,
        fieldname: f.fieldname
      })));
      
      // Extract URLs from uploaded files
      const urls = [];
      for (const file of req.files) {
        try {
          let url;
          if (useCloudinary) {
            // Cloudinary returns file with path/url/secure_url
            url = file.path || file.url || file.secure_url;
            if (!url) {
              console.error(`⚠️ Cloudinary file missing URL:`, file);
              // Try to construct URL from public_id if available
              if (file.public_id) {
                url = cloudinary.url(file.public_id, { secure: true });
              } else {
                throw new Error(`Cloudinary upload succeeded but no URL returned for file: ${file.originalname}`);
              }
            }
          } else {
            // Local storage - return a full URL that can be accessed
            const filename = file.filename;
            const baseUrl = process.env.BASE_URL || process.env.VITE_API_URL?.replace('/api', '') || `http://localhost:${process.env.PORT || 5000}`;
            url = `${baseUrl}/uploads/${filename}`;
          }
          console.log(`✅ File processed: ${file.originalname} -> URL: ${url}`);
          urls.push(url);
        } catch (fileError) {
          console.error(`❌ Error processing file ${file.originalname}:`, fileError.message);
          // Continue with other files, but log the error
          console.error("File error details:", fileError);
        }
      }
      
      if (urls.length === 0) {
        throw new Error("Failed to process any uploaded files");
      }
      
      console.log("=== UPLOAD SUCCESS ===");
      console.log(`Successfully processed ${urls.length} of ${req.files.length} files`);
      console.log("URLs returned:", urls);
      
      return res.json({ 
        success: true,
        urls: urls,
        count: urls.length,
        message: `Successfully uploaded ${urls.length} file(s)`
      });
    } catch (error) {
      console.error("=== UPLOAD PROCESSING ERROR ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      // Don't expose stack trace in production
      const errorResponse = {
        error: "Failed to process uploaded files",
        message: error.message || "Unknown error occurred",
        errorType: error.constructor.name
      };
      
      if (process.env.NODE_ENV === "development") {
        errorResponse.stack = error.stack;
        errorResponse.details = JSON.stringify(error, Object.getOwnPropertyNames(error));
      }
      
      return res.status(500).json(errorResponse);
    }
  });
});

export default router;
