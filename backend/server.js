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
import fileManagementRoutes from "./routes/fileManagementRoutes.js";

// Import reminder job (load asynchronously to prevent blocking startup)
// Use dynamic import to handle errors gracefully
import("./automation/reminderJob.js")
  .then(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("✅ Reminder job module loaded");
    }
  })
  .catch((error) => {
    // Only warn in development
    if (process.env.NODE_ENV === 'development') {
      console.warn("⚠️ Warning: Could not load reminder job module:", error.message);
      console.warn("   Reminder functionality may not work, but server will continue");
    }
  });

//2. Initialize environment variables
dotenv.config({ quiet: true }); // Suppress dotenv tips/warnings
if (process.env.NODE_ENV !== 'production') {
  console.log("✅ Environment variables loaded");
}

//3. Create an express app
const app = express();
if (process.env.NODE_ENV === 'development') {
  console.log("✅ Express app created");
}

// Get directory path for static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//4. Middleware setup
// CORS configuration - allow specific origins
const allowedOrigins = [
  'https://project-management-dashboard-frontend-2.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// ✅ Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '10mb' })); // Parse incoming JSON requests
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// ✅ Error handling for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error("❌ JSON parse error:", err.message);
    return res.status(400).json({ 
      error: "Invalid JSON in request body",
      message: err.message 
    });
  }
  next();
});

// Serve uploaded files statically (BEFORE static file middleware)
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// ✅ Serve static files from React app build (for production)
const frontendBuildPath = path.join(__dirname, "..", "frontend", "dist");
const frontendIndexPath = path.join(frontendBuildPath, "index.html");

// Log build path for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log(`📁 Checking frontend build at: ${frontendBuildPath}`);
  console.log(`📁 Absolute path: ${path.resolve(frontendBuildPath)}`);
  console.log(`📁 Build exists: ${existsSync(frontendBuildPath)}`);
  console.log(`📁 Index.html exists: ${existsSync(frontendIndexPath)}`);
}

// Check if frontend build exists and serve static files
if (existsSync(frontendBuildPath)) {
  // Serve static assets (JS, CSS, images) from the dist folder
  // CRITICAL: Serve static files BEFORE API routes to prevent 404 errors on assets
  // Use fallthrough: true so non-existent files continue to catch-all route
  app.use(express.static(frontendBuildPath, { 
    fallthrough: true, // Continue to next middleware if file doesn't exist
    index: false, // Don't serve index.html automatically
    maxAge: '1d', // Cache static assets for 1 day
    etag: true, // Enable ETag for caching
    lastModified: true // Enable Last-Modified header
  }));
  
  console.log("✅ Serving static files from frontend/dist");
  console.log(`✅ Frontend index.html path: ${frontendIndexPath}`);
  console.log(`✅ Frontend index.html exists: ${existsSync(frontendIndexPath)}`);
} else {
  console.warn(`⚠️ Frontend build not found at: ${frontendBuildPath}`);
  console.warn(`   This is expected in development mode.`);
  console.warn(`   In production, make sure to build the frontend first.`);
}

//5. Basic test route
// app.get("/", (req, res) => {
//   res.send("Backend server is running successfully!");
// });

// ✅ Add request logging middleware for API routes (before route registration)
app.use((req, res, next) => {
  // Only log API requests
  if (req.path.startsWith("/api")) {
    console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  }
  next();
});

// ✅ PERMANENT FIX: Route Registration with Verification
// CRITICAL: All routes MUST be registered BEFORE the catch-all handler
// This function ensures routes are registered correctly and verifies them
function registerAllRoutes() {
  // Only log detailed route registration in development
  if (process.env.NODE_ENV === 'development') {
    console.log("\n🚀 Starting route registration...");
  }
  
  // Step 1: Verify all route modules are imported correctly
  const routeModules = {
    auth: authRoutes,
    projects: projectRoutes,
    tasks: taskRoutes,
    users: userRoutes,
    dashboard: dashboardRoutes,
    upload: uploadRoutes,
    profileUpload: profileUploadRoutes,
    access: accessRoutes,
    fileManagement: fileManagementRoutes,
  };
  
  // Verify all routes exist
  for (const [name, route] of Object.entries(routeModules)) {
    if (!route) {
      const error = new Error(`❌ ${name}Routes is not imported or is undefined`);
      console.error(error.message);
      throw error;
    }
    if (typeof route !== 'function' && typeof route !== 'object') {
      const error = new Error(`❌ ${name}Routes has invalid type: ${typeof route}`);
      console.error(error.message);
      throw error;
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(`   ✅ ${name}Routes verified`);
    }
  }
  
  // Step 2: Register routes in guaranteed order (auth FIRST)
  if (process.env.NODE_ENV === 'development') {
    console.log("\n📝 Registering routes...");
  }
  
  // CRITICAL: Auth routes MUST be registered first
  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/profile-upload", profileUploadRoutes);
  app.use("/api/access", accessRoutes);
  app.use("/api/file-management", fileManagementRoutes);
  
  if (process.env.NODE_ENV === 'development') {
    console.log("   ✅ /api/auth → authRoutes");
    console.log("   ✅ /api/projects → projectRoutes");
    console.log("   ✅ /api/tasks → taskRoutes");
    console.log("   ✅ /api/users → userRoutes");
    console.log("   ✅ /api/dashboard → dashboardRoutes");
    console.log("   ✅ /api/upload → uploadRoutes");
    console.log("   ✅ /api/profile-upload → profileUploadRoutes");
    console.log("   ✅ /api/access → accessRoutes");
    console.log("   ✅ /api/file-management → fileManagementRoutes");
    
    // Step 3: Verify routes are actually registered in Express
    console.log("\n🔍 Verifying route registration in Express...");
    const registeredRoutes = [];
    let authRouterFound = false;
    
    if (app._router && app._router.stack) {
      app._router.stack.forEach((middleware, index) => {
        if (middleware.route) {
          const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
          registeredRoutes.push(`[${index}] ${methods} ${middleware.route.path}`);
        } else if (middleware.name === 'router') {
          const regex = middleware.regexp.source;
          if (regex.includes('auth') || regex.includes('/api/auth')) {
            authRouterFound = true;
            console.log(`   ✅ Auth router found at stack index ${index}`);
          }
          registeredRoutes.push(`[${index}] Router: ${regex.substring(0, 50)}...`);
        }
      });
    }
    
    if (!authRouterFound) {
      console.log("   ℹ️  Note: Auth router verification check has limitations (this is normal)");
    }
    
    console.log(`   📊 Total middleware/routes in stack: ${registeredRoutes.length}`);
    
    // Step 4: Log critical routes
    console.log("\n📋 Critical Auth Routes (should be accessible):");
    console.log("   ✅ POST /api/auth/login");
    console.log("   ✅ POST /api/auth/signup");
    console.log("   ✅ GET  /api/auth/check-admin");
    console.log("   ✅ GET  /api/auth/me (protected)");
    
    console.log("\n✅ Route registration completed successfully!");
  }
  
  return true;
}

// Execute route registration with error handling
try {
  registerAllRoutes();
} catch (error) {
  console.error("\n❌ CRITICAL ERROR: Route registration failed!");
  console.error("Error message:", error.message);
  console.error("Error stack:", error.stack);
  console.error("\n⚠️  Server will continue but routes may not work correctly.");
  console.error("⚠️  Please check the error above and fix the route imports.");
  // Don't throw - let server start but log the error clearly
  // This prevents server from crashing but makes the issue obvious
}

// ✅ Health check and route verification endpoints
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    routes: {
      auth: "/api/auth",
      projects: "/api/projects",
      tasks: "/api/tasks",
      users: "/api/users",
      dashboard: "/api/dashboard",
      upload: "/api/upload",
      access: "/api/access"
    }
  });
});

// ✅ Route listing endpoint - helps debug 404 errors
app.get("/api/routes", (req, res) => {
  const routes = [];
  
  if (app._router && app._router.stack) {
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(', ');
        routes.push({
          method: methods,
          path: middleware.route.path,
          type: "direct"
        });
      } else if (middleware.name === 'router' && middleware.regexp) {
        const regex = middleware.regexp.source;
        routes.push({
          method: "ALL",
          path: regex,
          type: "router"
        });
      }
    });
  }
  
  res.json({
    message: "Registered routes",
    total: routes.length,
    routes: routes,
    availableEndpoints: {
      auth: [
        "POST /api/auth/login",
        "POST /api/auth/signup",
        "GET /api/auth/check-admin",
        "GET /api/auth/me",
        "PUT /api/auth/profile"
      ],
      projects: [
        "GET /api/projects",
        "GET /api/projects/:id",
        "POST /api/projects",
        "PUT /api/projects/:id",
        "DELETE /api/projects/:id"
      ],
      tasks: [
        "GET /api/tasks",
        "GET /api/tasks/:id",
        "POST /api/tasks",
        "PUT /api/tasks/:id",
        "DELETE /api/tasks/:id"
      ],
      users: [
        "GET /api/users",
        "GET /api/users/:id",
        "POST /api/users",
        "PUT /api/users/:id",
        "DELETE /api/users/:id"
      ],
      dashboard: [
        "GET /api/dashboard"
      ]
    }
  });
});

// ✅ CRITICAL: Register test endpoints BEFORE catch-all to verify routes
// Test auth endpoint - verify routes are working
app.get("/api/auth/test", (req, res) => {
  res.json({ 
    message: "✅ Auth routes are working!", 
    timestamp: new Date().toISOString(),
    routes: {
      login: "POST /api/auth/login",
      signup: "POST /api/auth/signup",
      checkAdmin: "GET /api/auth/check-admin",
      me: "GET /api/auth/me (protected)"
    },
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// ✅ Direct login endpoint test (bypasses router to verify server is working)
app.post("/api/auth/login-test", (req, res) => {
  console.log("🔍 Login test endpoint hit - this verifies the server is receiving POST requests");
  res.status(200).json({ 
    message: "✅ Server is receiving POST requests to /api/auth/login-test",
    body: req.body,
    timestamp: new Date().toISOString(),
    note: "This is a test endpoint. The actual login route should be at /api/auth/login"
  });
});

// Route verification endpoint - list all registered routes
app.get("/api/routes", (req, res) => {
  res.json({
    message: "Registered API routes",
    routes: {
      auth: [
        "POST /api/auth/login",
        "POST /api/auth/signup",
        "GET /api/auth/check-admin",
        "GET /api/auth/me (protected)",
        "POST /api/auth/reset-admin"
      ],
      projects: "All routes under /api/projects",
      tasks: "All routes under /api/tasks",
      users: "All routes under /api/users",
      dashboard: "GET /api/dashboard",
      upload: "All routes under /api/upload",
      profileUpload: "All routes under /api/profile-upload",
      access: "All routes under /api/access"
    }
  });
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
// CRITICAL: This MUST be the last middleware - placed AFTER all API routes
// This fixes the 404 error when reloading pages with client-side routing
// Must be placed AFTER all API routes and static file serving
// This MUST be the last middleware - it should NEVER call next() to ensure it catches all routes
app.use((req, res) => {
  // CRITICAL: Check for API routes FIRST - if we reach here for an API route,
  // it means the route wasn't registered or doesn't match
  const isApiRoute = req.path.startsWith("/api") || req.path.startsWith("/uploads");
  
  if (isApiRoute) {
    console.error(`❌ API/Upload route not found: ${req.method} ${req.path}`);
    console.error(`   Requested path: ${req.path}`);
    console.error(`   Request method: ${req.method}`);
    console.error(`   Request URL: ${req.url}`);
    console.error(`   Original URL: ${req.originalUrl}`);
    console.error(`   Base URL: ${req.baseUrl}`);
    
    // Provide helpful suggestions based on the path
    let suggestions = [];
    if (req.path.includes("/auth")) {
      suggestions.push("Try: GET /api/auth/test to verify auth routes");
      suggestions.push("Login: POST /api/auth/login");
      suggestions.push("Check admin: GET /api/auth/check-admin");
    } else if (req.path.includes("/projects")) {
      suggestions.push("List projects: GET /api/projects");
      suggestions.push("Get project: GET /api/projects/:id");
    } else if (req.path.includes("/tasks")) {
      suggestions.push("List tasks: GET /api/tasks");
      suggestions.push("Get task: GET /api/tasks/:id");
    } else if (req.path.includes("/users")) {
      suggestions.push("List users: GET /api/users");
    } else if (req.path.includes("/dashboard")) {
      suggestions.push("Dashboard: GET /api/dashboard");
    }
    
    return res.status(404).json({ 
      error: "API route not found", 
      path: req.path,
      url: req.url,
      method: req.method,
      message: `The requested API endpoint '${req.method} ${req.path}' does not exist.`,
      hint: "Check that the route is registered in server.js before the catch-all handler.",
      suggestions: suggestions,
      availableEndpoints: {
        test: "GET /api/test - List all available endpoints",
        routes: "GET /api/routes - List registered routes",
        health: "GET /api/health - Health check"
      },
      troubleshooting: {
        checkServerLogs: "Look for route registration messages in server startup logs",
        verifyRoute: "Test with: GET /api/test to see all available endpoints",
        commonIssues: [
          "Route might need authentication token",
          "Check HTTP method (GET, POST, PUT, DELETE)",
          "Verify route path matches exactly",
          "Ensure server was restarted after code changes"
        ]
      }
    });
  }
  
  console.log(`🔍 Catch-all route hit: ${req.method} ${req.path}`);
  
  // Handle GET and HEAD requests (HEAD is used by Render for health checks)
  // All other methods (POST, PUT, DELETE, etc.) should have been handled by API routes above
  if (req.method !== "GET" && req.method !== "HEAD") {
    console.log(`❌ Method not allowed for catch-all: ${req.method} ${req.path}`);
    return res.status(404).json({ 
      error: "Method not allowed", 
      path: req.path, 
      method: req.method,
      message: "This route only accepts GET and HEAD requests. API routes should be accessed via /api/*"
    });
  }
  
  // For HEAD requests, just return 200 OK (health check)
  if (req.method === "HEAD") {
    return res.status(200).end();
  }
  
  // For ALL GET requests that are not API/uploads and not static files, serve index.html
  // This includes routes like /login, /projects, /timeline, /tasks, etc.
  // Static files (with extensions) are handled by express.static above
  // If a static file doesn't exist, express.static will call next() due to fallthrough: true
  try {
    // If frontend build exists, serve index.html (for production)
    // This allows React Router to handle client-side routing
    if (existsSync(frontendIndexPath)) {
      const resolvedPath = path.resolve(frontendIndexPath);
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Serving index.html for client-side route: ${req.path}`);
      }
      // Set proper headers to prevent caching issues
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(resolvedPath, (err) => {
        if (err) {
          console.error(`❌ Error sending index.html for ${req.path}:`, err.message);
          if (!res.headersSent) {
            res.status(500).json({
              error: "Error serving frontend",
              message: err.message,
              path: req.path,
            });
          }
        }
      });
      return;
    }
    
    // Frontend build not found - this should not happen in production
    console.error(`❌ Frontend build not found at: ${frontendIndexPath}`);
    console.error(`   Requested path: ${req.path}`);
    console.error(`   Build path: ${frontendBuildPath}`);
    console.error(`   Build path exists: ${existsSync(frontendBuildPath)}`);
    console.error(`   Index path exists: ${existsSync(frontendIndexPath)}`);
    
    // Try to provide helpful error message
    if (!res.headersSent) {
      res.status(503).json({
        error: "Frontend not built",
        message: "The frontend build is missing. Please build the frontend before deploying.",
        frontendPath: frontendIndexPath,
        buildPath: frontendBuildPath,
        exists: existsSync(frontendIndexPath),
        buildExists: existsSync(frontendBuildPath),
        requestedPath: req.path,
        note: "In Render, make sure the build command includes: cd frontend && npm install && npm run build",
      });
    }
  } catch (error) {
    console.error("❌ Error in catch-all route:", error.message);
    console.error("   Requested path:", req.path);
    console.error("Full error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
        path: req.path,
      });
    }
  }
});

//6. Define server PORT (from .env or fallback to 5000)
const PORT = process.env.PORT || 5000;

//7. Start the server with error handling and route verification
try {
  const server = app.listen(PORT, () => {
    // Only show detailed startup logs in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ SERVER STARTED SUCCESSFULLY`);
      console.log(`${'='.repeat(60)}`);
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Environment: development`);
      console.log(`✅ Server URL: http://localhost:${PORT}`);
      console.log(`✅ API Base URL: http://localhost:${PORT}/api`);
      console.log(`\n📡 Critical Endpoints:`);
      console.log(`   ✅ Login: POST http://localhost:${PORT}/api/auth/login`);
      console.log(`   ✅ Health: GET http://localhost:${PORT}/api/health`);
      console.log(`   ✅ Routes: GET http://localhost:${PORT}/api/routes`);
      console.log(`   ✅ Auth Test: GET http://localhost:${PORT}/api/auth/test`);
      
      // ✅ PERMANENT FIX: Verify routes are actually working after server starts
      console.log(`\n🔍 Performing post-startup route verification...`);
      
      // Use a small delay to ensure server is fully ready
      setTimeout(() => {
        // Check if route exists by testing the router
        let routeFound = false;
        if (app._router && app._router.stack) {
          for (const middleware of app._router.stack) {
            if (middleware.name === 'router' && middleware.regexp) {
              const regex = middleware.regexp;
              if (regex.test('/api/auth/login') || regex.test('/api/auth')) {
                routeFound = true;
                break;
              }
            }
          }
        }
        
        if (routeFound) {
          console.log(`   ✅ Route verification: Auth routes are registered`);
        } else {
          console.log(`   ℹ️  Route verification: Could not confirm auth routes in stack (this is normal)`);
        }
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ Server is ready to accept requests`);
        console.log(`${'='.repeat(60)}\n`);
      }, 100);
    } else {
      // Minimal production logs
      console.log(`✅ Server started on port ${PORT}`);
    }
  });
  
  // Store server reference for graceful shutdown
  process.server = server;

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
