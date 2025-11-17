// server.js
//---------------------------------
// basic express server setup for project management dashbboard backend
//---------------------------------

//1. Import required modules
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { getGoogleSheet } from "./config/googleSheetConfig.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import profileUploadRoutes from "./routes/profileUploadRoutes.js";
import accessRoutes from "./routes/accessRoutes.js";
import authRoutes from "./routes/authRoutes.js";

// Import reminder job (load asynchronously to prevent blocking startup)
// Use dynamic import to handle errors gracefully
import("./automation/reminderJob.js")
  .then(() => {
    console.log("✅ Reminder job module loaded");
  })
  .catch((error) => {
    console.warn("⚠️ Warning: Could not load reminder job module:", error.message);
    console.warn("   Reminder functionality may not work, but server will continue");
  });

//2. Initialize environment variables
dotenv.config();
console.log("✅ Environment variables loaded");

//3. Create an express app
const app = express();
console.log("✅ Express app created");

// Get directory path for static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//4. Middleware setup
// CORS configuration - allow all origins for now (can be restricted in production)
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); //parse incoming JSON requests

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Serve static files from React app build (for production)
const frontendBuildPath = path.join(__dirname, "..", "frontend", "dist");
const frontendIndexPath = path.join(frontendBuildPath, "index.html");

// Check if frontend build exists and serve static files
// Set fallthrough to true so missing files call next() and our catch-all can handle client-side routes
if (existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath, { fallthrough: true }));
  console.log("✅ Serving static files from frontend/dist");
}

//5. Basic test route
// app.get("/", (req, res) => {
//   res.send("Backend server is running successfully!");
// });

// ✅ Use routes
try {
  app.use("/api/projects", projectRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/profile-upload", profileUploadRoutes);
  app.use("/api/access", accessRoutes);
  app.use("/api/auth", authRoutes);
  console.log("✅ All API routes registered");
} catch (error) {
  console.error("❌ Error registering routes:", error);
  throw error;
}

// Debug: Log all registered routes
console.log("✅ Auth routes registered at /api/auth");
console.log("   - GET  /api/auth/check-admin");
console.log("   - POST /api/auth/signup");
console.log("   - POST /api/auth/login");

// Test auth endpoint
app.get("/api/auth/test", (req, res) => {
  res.json({ message: "✅ Auth routes are working!", timestamp: new Date().toISOString() });
});

// ✅ Test route for Google Sheets
app.get("/api/test", async (req, res) => {
  try {
    const { sheets, GOOGLE_SHEET_ID } = await getGoogleSheet();

    // Read data from first sheet (A1:B2)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Sheet1!A1:B2",
    });

    res.status(200).json({
      message: "✅ Google Sheets connection successful!",
      data: response.data.values || [],
    });
  } catch (error) {
    console.error("❌ Google Sheets connection failed:", error.message);
    res.status(500).json({
      message: "❌ Google Sheets connection failed!",
      error: error.message,
    });
  }
});

// ✅ Test route for task reminders (manual trigger)
app.get("/api/test/reminders", async (req, res) => {
  try {
    const { sendTaskReminders } = await import("./automation/reminderJob.js");
    const result = await sendTaskReminders();
    
    if (result.success) {
      res.status(200).json({
        message: result.message,
        remindersSent: result.remindersSent,
        reminders: result.reminders || [],
      });
    } else {
      res.status(500).json({
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Test reminder failed:", error.message);
    res.status(500).json({
      message: "❌ Test reminder failed!",
      error: error.message,
    });
  }
});

// ✅ Catch-all handler: serve React app for all non-API routes
// This fixes the 404 error when reloading pages with client-side routing
// Must be placed AFTER all API routes and static file serving
// Using a function-based route handler to avoid path-to-regexp issues
app.use((req, res, next) => {
  // Only handle GET requests
  if (req.method !== "GET") {
    return next();
  }
  
  // Skip API routes and uploads
  if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
    return next();
  }
  
  // Skip if it's a request for a static file (has extension like .js, .css, .png, etc.)
  // Static files should be handled by express.static middleware above
  const hasExtension = /\.[^/]+$/.test(req.path.split('?')[0]); // Remove query string
  if (hasExtension) {
    return next(); // Let express.static handle it or return 404
  }
  
  // For all other GET requests (client-side routes), serve index.html
  try {
    // If frontend build exists, serve index.html (for production)
    // This allows React Router to handle client-side routing
    if (existsSync(frontendIndexPath)) {
      const resolvedPath = path.resolve(frontendIndexPath);
      return res.sendFile(resolvedPath);
    }
    
    // For development: redirect to Vite dev server or show message
    // In development, frontend runs on separate port (usually 5173)
    res.status(200).json({
      message: "Backend server is running",
      note: "In development, access the frontend through Vite dev server (usually http://localhost:5173)",
      note2: "In production, build the frontend (npm run build) and it will be served from this server",
    });
  } catch (error) {
    console.error("❌ Error in catch-all route:", error.message);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

//6. Define server PORT (from .env or fallback to 5000)
const PORT = process.env.PORT || 5000;

//7. Start the server with error handling
try {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Promise Rejection:', error);
    // Don't exit in production, just log
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
