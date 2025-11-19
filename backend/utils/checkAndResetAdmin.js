// Utility script to check and reset admin credentials
// Run: node backend/utils/checkAndResetAdmin.js

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
const ADMIN_EMAIL = "sohansarang067@gmail.com";
const ADMIN_PASSWORD = "Sohan067@2655"; // Default password

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

async function checkAndResetAdmin() {
  try {
    console.log("🔍 Checking admin credentials...\n");
    
    // Ensure AuthUsers sheet exists
    await createSheetIfNotExists(SHEET_NAME, AUTH_USERS_HEADERS);
    
    // Read existing users
    const { rows } = await readSheetValues(SHEET_NAME);
    
    if (!rows || rows.length === 0) {
      console.log("❌ No users found in sheet. Creating new admin...\n");
      
      // Create new admin
      const newAdmin = {
        id: ADMIN_EMAIL.toLowerCase(),
        email: ADMIN_EMAIL.toLowerCase(),
        password: hashPassword(ADMIN_PASSWORD),
        role: "admin",
        profilePhoto: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      
      const row = userToRow(newAdmin);
      await appendRow(SHEET_NAME, row);
      
      console.log("✅ Admin created successfully!");
      console.log("📧 Email:", ADMIN_EMAIL);
      console.log("🔐 Password:", ADMIN_PASSWORD);
      console.log("👤 Role: admin");
      return;
    }
    
    // Find admin by email or role
    let adminRow = null;
    let adminRowIndex = -1;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;
      
      const user = rowToUser(row);
      const email = (row[1] || "").toLowerCase();
      
      if (email === ADMIN_EMAIL.toLowerCase() || user.role === "admin") {
        adminRow = row;
        adminRowIndex = i;
        break;
      }
    }
    
    if (!adminRow) {
      console.log("❌ No admin found. Creating new admin...\n");
      
      // Create new admin
      const newAdmin = {
        id: ADMIN_EMAIL.toLowerCase(),
        email: ADMIN_EMAIL.toLowerCase(),
        password: hashPassword(ADMIN_PASSWORD),
        role: "admin",
        profilePhoto: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      
      const row = userToRow(newAdmin);
      await appendRow(SHEET_NAME, row);
      
      console.log("✅ Admin created successfully!");
      console.log("📧 Email:", ADMIN_EMAIL);
      console.log("🔐 Password:", ADMIN_PASSWORD);
      console.log("👤 Role: admin");
      return;
    }
    
    // Admin exists - show current info and update
    const currentAdmin = rowToUser(adminRow);
    console.log("📋 Current Admin Info:");
    console.log("   ID:", currentAdmin.id);
    console.log("   Email:", currentAdmin.email);
    console.log("   Role:", currentAdmin.role);
    console.log("   IsActive:", currentAdmin.isActive);
    console.log("   CreatedAt:", currentAdmin.createdAt);
    console.log("   UpdatedAt:", currentAdmin.updatedAt);
    console.log("\n🔄 Resetting admin credentials...\n");
    
    // Update admin with new credentials
    const updatedAdmin = {
      id: ADMIN_EMAIL.toLowerCase(),
      email: ADMIN_EMAIL.toLowerCase(),
      password: hashPassword(ADMIN_PASSWORD),
      role: "admin",
      profilePhoto: currentAdmin.profilePhoto || "",
      createdAt: currentAdmin.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };
    
    const updatedRow = userToRow(updatedAdmin);
    const rowNumber = adminRowIndex + 2; // +2 because: +1 for header, +1 for 1-based index
    
    await updateRow(SHEET_NAME, rowNumber, updatedRow);
    
    console.log("✅ Admin credentials updated successfully!");
    console.log("📧 Email:", ADMIN_EMAIL);
    console.log("🔐 Password:", ADMIN_PASSWORD);
    console.log("👤 Role: admin");
    console.log("✅ IsActive: true");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

checkAndResetAdmin();




