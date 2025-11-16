// Utility script to update admin credentials in Google Sheets
// Run with: node backend/utils/updateAdminCredentials.js

import dotenv from "dotenv";
import {
  readSheetValues,
  updateRow,
  appendRow,
  createSheetIfNotExists,
} from "../services/googleSheetService.js";
import crypto from "crypto";

dotenv.config();

const SHEET_NAME = "AuthUsers";
const NEW_ADMIN_EMAIL = "sohansarang05@gmail.com";
const NEW_ADMIN_PASSWORD = "Sohan067@2655";
const OLD_ADMIN_EMAIL = "sohansarang067@gmail.com"; // Old email to find and update

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

// Helper: Convert object to row array
function userToRow(user) {
  return [
    user.id || user.email || "",
    user.email || "",
    user.password || "",
    user.role || "user",
    user.profilePhoto || "",
    user.createdAt || new Date().toISOString(),
    user.updatedAt || new Date().toISOString(),
    user.isActive !== false ? "true" : "false",
  ];
}

// Helper: Convert row array to object
function rowToUser(row) {
  let isActive = true;
  if (row.length > 7 && row[7] !== undefined && row[7] !== null && row[7] !== "") {
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

async function updateAdminCredentials() {
  try {
    console.log("🔄 Starting admin credentials update...");
    console.log("📧 New Email:", NEW_ADMIN_EMAIL);
    console.log("🔐 New Password:", "***" + NEW_ADMIN_PASSWORD.slice(-3));
    
    // Ensure sheet exists
    await createSheetIfNotExists(SHEET_NAME, AUTH_USERS_HEADERS);
    
    // Read all users
    const { rows } = await readSheetValues(SHEET_NAME);
    
    if (!rows || rows.length === 0) {
      console.log("❌ No users found in sheet. Creating new admin account...");
      
      // Create new admin user
      const newAdmin = {
        id: NEW_ADMIN_EMAIL.toLowerCase(),
        email: NEW_ADMIN_EMAIL.toLowerCase(),
        password: hashPassword(NEW_ADMIN_PASSWORD),
        role: "admin",
        profilePhoto: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      
      const row = userToRow(newAdmin);
      await appendRow(SHEET_NAME, row, AUTH_USERS_HEADERS);
      
      console.log("✅ New admin account created successfully!");
      return;
    }
    
    // Find admin user (by old email or by admin role)
    let adminRowIndex = -1;
    let adminUser = null;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;
      
      const user = rowToUser(row);
      const email = (row[1] || "").toLowerCase();
      
      // Check if this is the admin (by old email, new email, or admin role)
      if (
        email === OLD_ADMIN_EMAIL.toLowerCase() ||
        email === NEW_ADMIN_EMAIL.toLowerCase() ||
        user.role === "admin"
      ) {
        adminRowIndex = i;
        adminUser = user;
        break;
      }
    }
    
    if (adminRowIndex === -1) {
      console.log("❌ Admin user not found. Creating new admin account...");
      
      // Create new admin user
      const newAdmin = {
        id: NEW_ADMIN_EMAIL.toLowerCase(),
        email: NEW_ADMIN_EMAIL.toLowerCase(),
        password: hashPassword(NEW_ADMIN_PASSWORD),
        role: "admin",
        profilePhoto: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      
      const row = userToRow(newAdmin);
      await appendRow(SHEET_NAME, row, AUTH_USERS_HEADERS);
      
      console.log("✅ New admin account created successfully!");
      return;
    }
    
    // Update existing admin
    console.log("📝 Found admin user. Updating credentials...");
    console.log("   Old email:", adminUser.email);
    console.log("   Old role:", adminUser.role);
    
    // Update admin user
    const updatedAdmin = {
      ...adminUser,
      id: NEW_ADMIN_EMAIL.toLowerCase(),
      email: NEW_ADMIN_EMAIL.toLowerCase(),
      password: hashPassword(NEW_ADMIN_PASSWORD),
      role: "admin", // Ensure role is admin
      updatedAt: new Date().toISOString(),
      isActive: true, // Ensure admin is active
    };
    
    const rowNumber = adminRowIndex + 2; // +2 because: +1 for header row, +1 for 0-based index
    const updatedRow = userToRow(updatedAdmin);
    
    await updateRow(SHEET_NAME, rowNumber, updatedRow);
    
    console.log("✅ Admin credentials updated successfully!");
    console.log("   New email:", updatedAdmin.email);
    console.log("   Role:", updatedAdmin.role);
    console.log("   IsActive:", updatedAdmin.isActive);
    console.log("\n🎉 You can now login with:");
    console.log("   Email:", NEW_ADMIN_EMAIL);
    console.log("   Password:", NEW_ADMIN_PASSWORD);
    
  } catch (error) {
    console.error("❌ Error updating admin credentials:", error);
    console.error("Full error:", error.stack);
    process.exit(1);
  }
}

// Run the update
updateAdminCredentials()
  .then(() => {
    console.log("\n✅ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

