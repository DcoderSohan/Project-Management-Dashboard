// backend/controllers/authController.js
import {
  readSheetValues,
  appendRow,
  updateRow,
  createSheetIfNotExists,
} from "../services/googleSheetService.js";
import crypto from "crypto";

/**
 * Assumptions:
 * - Google Sheet has a tab named "AuthUsers" (will be created automatically if not exists)
 * - Row 1 is header: ID | Email | Password | Role | ProfilePhoto | CreatedAt | UpdatedAt | IsActive
 */

const SHEET_NAME = "AuthUsers";
const ADMIN_EMAIL = "sohansarang067@gmail.com";
// Note: Admin password is stored in Google Sheets (hashed), not in code
// ADMIN_PASSWORD constant removed - password is set during signup

// Headers for AuthUsers sheet
const AUTH_USERS_HEADERS = [
  "ID",
  "Email",
  "Password",
  "Role",
  "ProfilePhoto",
  "CreatedAt",
  "UpdatedAt",
  "IsActive",
];

// Helper: Hash password using SHA256
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Helper: Verify password
function verifyPassword(password, hashedPassword) {
  return hashPassword(password) === hashedPassword;
}

// Helper: Generate session token
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Simple in-memory session storage (in production, use Redis or database)
const sessions = new Map(); // token -> userId

/**
 * Store session
 */
function storeSession(token, userId) {
  sessions.set(token, userId);
  // Auto-expire after 24 hours
  setTimeout(() => {
    sessions.delete(token);
  }, 24 * 60 * 60 * 1000);
}

// Helper: Convert object to row array
function userToRow(user) {
  return [
    user.id || user.email || "", // Use email as ID if ID is not provided
    user.email || "",
    user.password || "", // Hashed password
    user.role || "user",
    user.profilePhoto || "",
    user.createdAt || new Date().toISOString(),
    user.updatedAt || new Date().toISOString(),
    user.isActive !== false ? "true" : "false",
  ];
}

// Helper: Convert row array to object
function rowToUser(row) {
  // Handle isActive: check if row[7] exists and is truthy
  // Default to true if not set (for backward compatibility)
  let isActive = true;
  if (row.length > 7 && row[7] !== undefined && row[7] !== null && row[7] !== "") {
    // Check if it's the string "true" or boolean true
    isActive = row[7] === "true" || row[7] === true || row[7] === "TRUE";
  }
  
  return {
    id: row[0] || "",
    email: row[1] || "",
    password: row[2] || "",
    role: row[3] || "user",
    profilePhoto: row[4] || "",
    createdAt: row[5] || "",
    updatedAt: row[6] || "",
    isActive: isActive,
  };
}

/**
 * Sign up admin (create admin account)
 * POST /api/auth/signup
 * This is the first-time setup for admin
 */
export const signup = async (req, res) => {
  try {
    console.log("📝 Signup request received");
    console.log("Request body:", { email: req.body.email, role: req.body.role, password: "***" });
    const { email, password, role = "user" } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Validate role
    if (role !== "admin" && role !== "user") {
      return res.status(400).json({ error: "Invalid role. Role must be 'admin' or 'user'" });
    }

    // If role is admin, check if email matches admin email
    if (role === "admin" && email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: "Only admin email can be used for admin role" });
    }

    // Check password strength
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Ensure AuthUsers sheet exists with headers
    console.log("🔍 Ensuring AuthUsers sheet exists...");
    await createSheetIfNotExists(SHEET_NAME, AUTH_USERS_HEADERS);
    
    // Read existing users
    const { rows } = await readSheetValues(SHEET_NAME);
    
    // Check if user already exists
    const userExists = (rows || []).find(
      (r) => r && r[1] && r[1].toLowerCase() === email.toLowerCase().trim()
    );

    if (userExists) {
      return res.status(400).json({ error: "User with this email already exists. Please login instead." });
    }

    // If creating admin, check if admin already exists
    if (role === "admin") {
      const adminExists = (rows || []).find((r) => {
        if (!r || r.length < 4) return false;
        const user = rowToUser(r);
        // Check if user has admin role OR matches the ADMIN_EMAIL
        return user.role === "admin" || (r[1] && r[1].toLowerCase() === ADMIN_EMAIL.toLowerCase());
      });

      if (adminExists) {
        return res.status(400).json({ error: "Admin account already exists. Please login instead." });
      }
    }

    // Create user with email as ID
    const newUser = {
      id: email.toLowerCase().trim(), // Use email as ID
      email: email.toLowerCase().trim(),
      password: hashPassword(password), // Hash the password provided by user
      role: role,
      profilePhoto: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };

    const row = userToRow(newUser);
    console.log("📝 Appending user to sheet...");
    console.log("Row data:", row);
    console.log("isActive value in row:", row[7]);
    await appendRow(SHEET_NAME, row, AUTH_USERS_HEADERS);
    
    // Verify the user was created correctly by reading it back
    await new Promise(resolve => setTimeout(resolve, 500));
    const { rows: verifyRows } = await readSheetValues(SHEET_NAME);
    const createdUser = verifyRows.find(
      (r) => r && r[1] && r[1].toLowerCase() === email.toLowerCase().trim()
    );
    if (createdUser) {
      const verifyUser = rowToUser(createdUser);
      console.log("✅ Verified created user:", {
        email: verifyUser.email,
        role: verifyUser.role,
        isActive: verifyUser.isActive,
        isActiveRaw: createdUser[7],
      });
      if (!verifyUser.isActive) {
        console.error("⚠️ WARNING: Created user is not active! Fixing...");
        // Fix it by updating the row
        const rowIndex = verifyRows.findIndex(
          (r) => r && r[1] && r[1].toLowerCase() === email.toLowerCase().trim()
        );
        if (rowIndex !== -1) {
          verifyUser.isActive = true;
          const fixedRow = userToRow(verifyUser);
          const rowNumber = 1 + rowIndex + 1;
          await updateRow(SHEET_NAME, rowNumber, fixedRow);
          console.log("✅ Fixed isActive status for user");
        }
      }
    }

    console.log(`✅ ${role === "admin" ? "Admin" : "User"} account created successfully`);
    console.log(`📝 Credentials saved in Google Sheets: ${SHEET_NAME}`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Role: ${role}`);
    console.log(`🔐 Password: (hashed and stored in Google Sheets)`);
    
    // Automatically login after signup
    const token = generateToken();
    storeSession(token, email.toLowerCase().trim());

    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      profilePhoto: "",
      createdAt: newUser.createdAt,
    };

    return res.status(201).json({
      message: `✅ ${role === "admin" ? "Admin" : "User"} account created successfully`,
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("❌ Error signing up admin:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ 
      error: error.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};

/**
 * Check if admin exists
 * GET /api/auth/check-admin
 */
export const checkAdminExists = async (req, res) => {
  try {
    console.log("🔍 Checking if admin exists...");
    
    // Ensure sheet exists first (don't create headers, just check)
    try {
      const { rows } = await readSheetValues(SHEET_NAME);
      
      // Check if admin already exists (by role or by ADMIN_EMAIL constant)
      const adminExists = (rows || []).find((r) => {
        if (!r || r.length < 4) return false;
        const user = rowToUser(r);
        // Check if user has admin role OR matches the original ADMIN_EMAIL
        return user.role === "admin" || (r[1] && r[1].toLowerCase() === ADMIN_EMAIL.toLowerCase());
      });

      console.log(`✅ Admin check complete. Exists: ${!!adminExists}`);
      return res.status(200).json({
        exists: !!adminExists,
      });
    } catch (error) {
      // If sheet doesn't exist, admin doesn't exist
      if (error.message && (error.message.includes("Unable to parse range") || error.message.includes("not found"))) {
        console.log("✅ Sheet doesn't exist yet, admin doesn't exist");
        return res.status(200).json({
          exists: false,
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("❌ Error checking admin:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ 
      error: error.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    console.log("🔐 Login request received");
    console.log("   Path:", req.path);
    console.log("   Method:", req.method);
    console.log("   Body:", { email: req.body?.email ? "***" : "missing", password: req.body?.password ? "***" : "missing" });
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Get all users from sheet
    const { rows } = await readSheetValues(SHEET_NAME);
    
    // Find user by email (check both admin email and any user with admin role)
    const userRow = (rows || []).find(
      (r) => r && r[1] && r[1].toLowerCase() === normalizedEmail
    );

    if (!userRow) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = rowToUser(userRow);
    
    // Check if this is admin (by email match or role)
    const isAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase() || user.role === "admin";

    if (isAdmin) {
      // Debug: Log the raw row data and parsed user
      console.log("🔍 Admin login - user data from sheet:", {
        rawRow: userRow,
        rowLength: userRow?.length,
        isActiveRaw: userRow[7],
        parsedUser: {
          email: user.email,
          isActive: user.isActive,
          role: user.role,
        },
      });

      // Verify admin password (compare hashed password)
      if (!verifyPassword(password, user.password)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Ensure admin user ID is email
      if (user.id !== user.email) {
        user.id = user.email.toLowerCase();
        user.updatedAt = new Date().toISOString();
        const userRowIndex = (rows || []).findIndex(
          (r) => r && r[1] && r[1].toLowerCase() === normalizedEmail
        );
        if (userRowIndex !== -1) {
          const rowNumber = 1 + userRowIndex + 1;
          await updateRow(SHEET_NAME, rowNumber, userToRow(user));
        }
      }

      // Check if user is active - if not, fix it (admin should always be active)
      // Also handle case where isActive might be undefined/null
      if (user.isActive === undefined || user.isActive === null) {
        console.log("⚠️ Admin user isActive is undefined/null during login, fixing...");
        user.isActive = true;
        user.updatedAt = new Date().toISOString();
        const userRowIndex = (rows || []).findIndex(
          (r) => r && r[1] && r[1].toLowerCase() === normalizedEmail
        );
        if (userRowIndex !== -1) {
          const rowNumber = 1 + userRowIndex + 1;
          await updateRow(SHEET_NAME, rowNumber, userToRow(user));
          console.log("✅ Fixed admin user isActive status during login (was undefined)");
        }
      } else if (!user.isActive) {
        console.log("⚠️ Admin user is not active during login, fixing...");
        user.isActive = true;
        user.updatedAt = new Date().toISOString();
        const userRowIndex = (rows || []).findIndex(
          (r) => r && r[1] && r[1].toLowerCase() === normalizedEmail
        );
        if (userRowIndex !== -1) {
          const rowNumber = 1 + userRowIndex + 1;
          await updateRow(SHEET_NAME, rowNumber, userToRow(user));
          console.log("✅ Fixed admin user isActive status during login");
        }
      }

      // Generate session token
      const token = generateToken();
      
      // Store session with email as ID (use actual email, not ADMIN_EMAIL constant)
      storeSession(token, user.email.toLowerCase());

      // Don't send password back
      const userResponse = {
        id: user.id || user.email,
        email: user.email,
        role: "admin",
        profilePhoto: user.profilePhoto || "",
        createdAt: user.createdAt,
      };

      return res.status(200).json({
        message: "✅ Login successful",
        token,
        user: userResponse,
      });
    }

    // For non-admin users (userRow and user already found above)
    // Note: user is already defined at line 286, so we can use it directly
    
    // Debug: Log user status
    console.log("🔍 Regular user login - user data:", {
      email: user.email,
      isActive: user.isActive,
      isActiveRaw: userRow[7],
    });

    // Check if user is active - default to true if not set
    if (user.isActive === undefined || user.isActive === null) {
      console.log("⚠️ User isActive is undefined/null, defaulting to true");
      user.isActive = true;
    }
    
    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    // Verify password
    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate session token
    const token = generateToken();
    
    // Store session (use email as ID if user.id is different)
    const userId = user.id || user.email;
    storeSession(token, userId);

    // Don't send password back
    const userResponse = {
      id: userId,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto || "",
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      message: "✅ Login successful",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("❌ Login error:", error.message);
    res.status(500).json({ error: error.message });
  }
};


/**
 * Verify token (middleware helper)
 * This can be used to verify tokens in protected routes
 */
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Check if token exists in sessions
    const userId = sessions.get(token);
    
    if (!userId) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get user from database (check both ID and email)
    const { rows } = await readSheetValues(SHEET_NAME);
    const userRow = (rows || []).find((r) => r && (r[0] === userId || r[1]?.toLowerCase() === userId.toLowerCase()));

    if (!userRow) {
      sessions.delete(token);
      return res.status(401).json({ error: "User not found" });
    }

    const user = rowToUser(userRow);
    
    // Check if user is admin (by role or email match with ADMIN_EMAIL)
    const isAdmin = user.role === "admin" || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (isAdmin) {
      // Debug: Log admin user status
      console.log("🔍 Token verification - Admin user:", {
        email: user.email,
        isActive: user.isActive,
        isActiveRaw: userRow[7],
        role: user.role,
      });
      
      // Check if user is active - if admin is not active, fix it (admin should always be active)
      // Also handle case where isActive might be undefined/null
      if (user.isActive === undefined || user.isActive === null) {
        console.log("⚠️ Admin user isActive is undefined/null during token verification, fixing...");
        user.isActive = true;
        user.updatedAt = new Date().toISOString();
        const userRowIndex = (rows || []).findIndex(
          (r) => r && (r[0] === userId || r[1]?.toLowerCase() === userId.toLowerCase())
        );
        if (userRowIndex !== -1) {
          const rowNumber = 1 + userRowIndex + 1;
          await updateRow(SHEET_NAME, rowNumber, userToRow(user));
          console.log("✅ Fixed admin user isActive status during token verification (was undefined)");
        }
      } else if (!user.isActive) {
        console.log("⚠️ Admin user is not active during token verification, fixing...");
        user.isActive = true;
        user.updatedAt = new Date().toISOString();
        const userRowIndex = (rows || []).findIndex(
          (r) => r && (r[0] === userId || r[1]?.toLowerCase() === userId.toLowerCase())
        );
        if (userRowIndex !== -1) {
          const rowNumber = 1 + userRowIndex + 1;
          await updateRow(SHEET_NAME, rowNumber, userToRow(user));
          console.log("✅ Fixed admin user isActive status during token verification");
        }
      }
      
      req.user = {
        id: user.id || user.email,
        email: user.email,
        role: "admin",
        profilePhoto: user.profilePhoto || "",
      };
      req.token = token;
      return next();
    }

    // For non-admin users
    
    // Debug: Log user status
    console.log("🔍 Token verification - Regular user:", {
      email: user.email,
      isActive: user.isActive,
      isActiveRaw: userRow[7],
    });

    // Check if user is active - default to true if not set
    if (user.isActive === undefined || user.isActive === null) {
      console.log("⚠️ User isActive is undefined/null, defaulting to true");
      user.isActive = true;
    }
    
    if (!user.isActive) {
      sessions.delete(token);
      return res.status(403).json({ error: "Account is deactivated" });
    }

    // Attach user to request (use email as ID if ID is different)
    req.user = {
      id: user.id || user.email,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto || "",
    };
    req.token = token;

    next();
  } catch (error) {
    console.error("❌ Token verification error:", error.message);
    res.status(401).json({ error: "Invalid token" });
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    // User is set by verifyToken middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    return res.status(200).json({
      message: "✅ User retrieved",
      user,
    });
  } catch (error) {
    console.error("❌ Get current user error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update admin profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { email, password, newPassword, currentPassword, profilePhoto } = req.body;
    const userId = req.user?.id; // Get from token (set by verifyToken middleware)

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { rows } = await readSheetValues(SHEET_NAME);
    // Find user by ID or email (for admin, ID is email)
    const userIndex = (rows || []).findIndex((r) => r && (r[0] === userId || r[1]?.toLowerCase() === userId.toLowerCase()));

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingUser = rowToUser(rows[userIndex]);

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      // Check if new email already exists (if changing email)
      if (email.toLowerCase() !== existingUser.email.toLowerCase()) {
        const emailExists = (rows || []).find(
          (r) => r && r[1] && r[1].toLowerCase() === email.toLowerCase()
        );
        if (emailExists) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }
    }

    // Handle password change - require current password verification
    let passwordToUpdate = existingUser.password;
    if (newPassword) {
      // If newPassword is provided, currentPassword is required
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required to change password" });
      }
      
      // Verify current password
      if (!verifyPassword(currentPassword, existingUser.password)) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      // Validate new password strength
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long" });
      }
      
      // Hash and set new password
      passwordToUpdate = hashPassword(newPassword);
      console.log("✅ Password updated successfully");
    } else if (password) {
      // Legacy support: if password is provided without currentPassword, use it (for backward compatibility)
      // But warn that this is deprecated
      console.warn("⚠️ Password update without current password verification (deprecated)");
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }
      passwordToUpdate = hashPassword(password);
    }

    // Update user
    const updatedUser = {
      ...existingUser,
      email: email || existingUser.email,
      password: passwordToUpdate,
      profilePhoto: profilePhoto !== undefined ? profilePhoto : existingUser.profilePhoto,
      updatedAt: new Date().toISOString(),
    };

    // Update ID if email changed (for both admin and regular users)
    if (email && email.toLowerCase() !== existingUser.email.toLowerCase()) {
      updatedUser.id = email.toLowerCase();
    } else if (existingUser.role === "admin" && existingUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      // Keep admin ID as email if it matches ADMIN_EMAIL
      updatedUser.id = updatedUser.email.toLowerCase();
    }

    const rowNumber = 1 + userIndex + 1;
    await updateRow(SHEET_NAME, rowNumber, userToRow(updatedUser));

    // Don't send password back
    const userResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      profilePhoto: updatedUser.profilePhoto,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    return res.status(200).json({
      message: "✅ Profile updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("❌ Update profile error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create user (admin only)
 * POST /api/auth/users
 */
export const createUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { email, password, role = "user" } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { rows } = await readSheetValues(SHEET_NAME);

    // Check if user already exists
    const userExists = (rows || []).find(
      (r) => r && r[1] && r[1].toLowerCase() === email.toLowerCase()
    );

    if (userExists) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create user with email as ID
    const newUser = {
      id: email.toLowerCase(), // Use email as ID
      email: email.toLowerCase(),
      password: hashPassword(password),
      role: role || "user",
      profilePhoto: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };

    const row = userToRow(newUser);
    await appendRow(SHEET_NAME, row);

    // Don't send password back
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      profilePhoto: newUser.profilePhoto,
      createdAt: newUser.createdAt,
    };

    return res.status(201).json({
      message: "✅ User created successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("❌ Create user error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all users (admin only)
 * GET /api/auth/users
 */
export const getAllUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    const { rows } = await readSheetValues(SHEET_NAME);
    
    if (!rows || rows.length === 0) {
      return res.status(200).json([]);
    }

    // Get all users (excluding password)
    const users = (rows || [])
      .filter((r) => r && r.length > 0)
      .map((r) => {
        const user = rowToUser(r);
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          profilePhoto: user.profilePhoto,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          isActive: user.isActive,
        };
      });

    return res.status(200).json(users);
  } catch (error) {
    console.error("❌ Get all users error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update user (admin only)
 * PUT /api/auth/users/:id
 */
export const updateUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { email, password, role, isActive, profilePhoto } = req.body;

    const { rows } = await readSheetValues(SHEET_NAME);
    // Find user by ID or email (for admin, ID is email)
    const userIndex = (rows || []).findIndex((r) => r && (r[0] === id || r[1]?.toLowerCase() === id.toLowerCase()));

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingUser = rowToUser(rows[userIndex]);

    // Prevent changing admin role or deactivating admin (but allow email and password updates)
    if (existingUser.role === "admin" || existingUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      if (role && role !== "admin") {
        return res.status(400).json({ error: "Admin role cannot be changed" });
      }
      if (isActive !== undefined && !isActive) {
        return res.status(400).json({ error: "Admin account cannot be deactivated" });
      }
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      // Check if new email already exists (if changing email)
      if (email.toLowerCase() !== existingUser.email.toLowerCase()) {
        const emailExists = (rows || []).find(
          (r) => r && r[1] && r[1].toLowerCase() === email.toLowerCase()
        );
        if (emailExists) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }
    }

    // Validate password if provided
    if (password && password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Update user
    const updatedUser = {
      ...existingUser,
      email: email || existingUser.email,
      password: password ? hashPassword(password) : existingUser.password,
      role: role !== undefined ? role : existingUser.role,
      isActive: isActive !== undefined ? isActive : existingUser.isActive,
      profilePhoto: profilePhoto !== undefined ? profilePhoto : existingUser.profilePhoto,
      updatedAt: new Date().toISOString(),
    };

    // Update ID if email changed (for both admin and regular users)
    if (email && email.toLowerCase() !== existingUser.email.toLowerCase()) {
      updatedUser.id = email.toLowerCase();
    } else if (existingUser.role === "admin" && existingUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      // Keep admin ID as email if it matches ADMIN_EMAIL
      updatedUser.id = updatedUser.email.toLowerCase();
    }

    const rowNumber = 1 + userIndex + 1;
    await updateRow(SHEET_NAME, rowNumber, userToRow(updatedUser));

    // Don't send password back
    const userResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      profilePhoto: updatedUser.profilePhoto || "",
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      isActive: updatedUser.isActive,
    };

    return res.status(200).json({
      message: "✅ User updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("❌ Update user error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete user (admin only)
 * DELETE /api/auth/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    const { rows } = await readSheetValues(SHEET_NAME);
    // Find user by ID or email (for admin, ID is email)
    const userIndex = (rows || []).findIndex((r) => r && (r[0] === id || r[1]?.toLowerCase() === id.toLowerCase()));

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rowToUser(rows[userIndex]);

    // Prevent deleting admin (check by email too)
    if (user.role === "admin" || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: "Cannot delete admin user" });
    }

    // Delete user (update isActive to false instead of deleting)
    const updatedUser = {
      ...user,
      isActive: false,
      updatedAt: new Date().toISOString(),
    };

    const rowNumber = 1 + userIndex + 1;
    await updateRow(SHEET_NAME, rowNumber, userToRow(updatedUser));

    return res.status(200).json({
      message: "✅ User deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete user error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Reset admin credentials (for emergency password reset)
 * POST /api/auth/reset-admin
 * This endpoint allows resetting admin credentials without authentication
 * WARNING: This should be secured in production (e.g., with a secret key)
 */
export const resetAdminCredentials = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Default to new admin credentials if not provided
    const newEmail = email || "sohansarang067@gmail.com";
    const newPassword = password || "Sohan067@2655";
    
    if (!newEmail || !newPassword) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }
    
    console.log("🔄 Resetting admin credentials...");
    console.log("📧 New Email:", newEmail);
    
    // Ensure sheet exists
    await createSheetIfNotExists(SHEET_NAME, AUTH_USERS_HEADERS);
    
    // Read all users
    const { rows } = await readSheetValues(SHEET_NAME);
    
    // Find admin user (by old email, new email, or admin role)
    let adminRowIndex = -1;
    let adminUser = null;
    const oldAdminEmail = "sohansarang067@gmail.com";
    
    for (let i = 0; i < (rows || []).length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;
      
      const user = rowToUser(row);
      const rowEmail = (row[1] || "").toLowerCase();
      
      // Check if this is the admin
      if (
        rowEmail === oldAdminEmail.toLowerCase() ||
        rowEmail === newEmail.toLowerCase() ||
        user.role === "admin"
      ) {
        adminRowIndex = i;
        adminUser = user;
        break;
      }
    }
    
    if (adminRowIndex === -1) {
      // Create new admin account
      console.log("📝 Creating new admin account...");
      const newAdmin = {
        id: newEmail.toLowerCase(),
        email: newEmail.toLowerCase(),
        password: hashPassword(newPassword),
        role: "admin",
        profilePhoto: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      
      const row = userToRow(newAdmin);
      await appendRow(SHEET_NAME, row, AUTH_USERS_HEADERS);
      
      return res.status(200).json({
        message: "✅ Admin account created successfully",
        email: newEmail,
      });
    }
    
    // Update existing admin
    console.log("📝 Updating existing admin credentials...");
    const updatedAdmin = {
      ...adminUser,
      id: newEmail.toLowerCase(),
      email: newEmail.toLowerCase(),
      password: hashPassword(newPassword),
      role: "admin",
      updatedAt: new Date().toISOString(),
      isActive: true,
    };
    
    const rowNumber = adminRowIndex + 2; // +2 because: +1 for header row, +1 for 0-based index
    const updatedRow = userToRow(updatedAdmin);
    
    await updateRow(SHEET_NAME, rowNumber, updatedRow);
    
    console.log("✅ Admin credentials reset successfully!");
    
    return res.status(200).json({
      message: "✅ Admin credentials reset successfully",
      email: newEmail,
    });
  } catch (error) {
    console.error("❌ Error resetting admin credentials:", error);
    res.status(500).json({ 
      error: error.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};

/**
 * Get all active sessions (logged-in users) - admin only
 * GET /api/auth/sessions
 */
export const getSessions = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get all users from AuthUsers sheet
    const { rows } = await readSheetValues(SHEET_NAME);
    
    if (!rows || rows.length === 0) {
      return res.status(200).json([]);
    }

    // Get all active users (those with active sessions)
    // In a real app, you'd check sessions map, but for now we'll return all active users
    const activeUsers = (rows || [])
      .filter((r) => r && r.length > 0 && (r[7] === "true" || r[7] === true))
      .map((r) => {
        const user = rowToUser(r);
        return {
          id: user.id,
          email: user.email,
          userName: user.email.split("@")[0], // Extract username from email
          userEmail: user.email,
          loginTime: user.createdAt, // Use created date as login time
          lastActivity: user.updatedAt, // Use updated date as last activity
          isActive: user.isActive,
          profilePhoto: user.profilePhoto,
        };
      });

    // Sort by last activity (most recent first)
    activeUsers.sort((a, b) => {
      const dateA = new Date(a.lastActivity || a.loginTime || 0);
      const dateB = new Date(b.lastActivity || b.loginTime || 0);
      return dateB - dateA;
    });

    return res.status(200).json(activeUsers);
  } catch (error) {
    console.error("❌ Get sessions error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

