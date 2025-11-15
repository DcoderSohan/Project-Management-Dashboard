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
import { getGoogleSheet } from "./config/googleSheetConfig.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import profileUploadRoutes from "./routes/profileUploadRoutes.js";
import accessRoutes from "./routes/accessRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import "./automation/reminderJob.js";

//2. Initialize environment variables
dotenv.config();

//3. Create an express app
const app = express();

// Get directory path for static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//4. Middleware setup
app.use(cors()); // allow frontend calls
app.use(express.json()); //parse incoming JSON requests

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//5. Basic test route
// app.get("/", (req, res) => {
//   res.send("Backend server is running successfully!");
// });

// ✅ Use routes
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/profile-upload", profileUploadRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/auth", authRoutes);

// Debug: Log all registered routes
console.log("✅ Auth routes registered at /api/auth");
console.log("   - GET  /api/auth/check-admin");
console.log("   - POST /api/auth/signup");
console.log("   - POST /api/auth/login");

// health
app.get("/", (req, res) => res.send("Backend running"));

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

//6. Define server PORT (from .env or fallback to 5000)
const PORT = process.env.PORT || 5000;

//7. Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
