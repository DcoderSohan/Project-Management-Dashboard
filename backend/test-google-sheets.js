// Test script to verify Google Sheets configuration
// Run: node backend/test-google-sheets.js

import { getGoogleSheet } from "./config/googleSheetConfig.js";
import { createSheetIfNotExists, readSheetValues } from "./services/googleSheetService.js";

async function testGoogleSheets() {
  try {
    console.log("🧪 Testing Google Sheets configuration...\n");
    
    // Test 1: Get Google Sheet client
    console.log("Test 1: Getting Google Sheet client...");
    const { sheets, GOOGLE_SHEET_ID } = await getGoogleSheet();
    console.log("✅ Google Sheet client obtained");
    console.log("   Sheet ID:", GOOGLE_SHEET_ID || "NOT SET (check GOOGLE_SHEET_ID env var)");
    
    if (!GOOGLE_SHEET_ID) {
      console.error("❌ GOOGLE_SHEET_ID is not set in environment variables!");
      console.error("   Please set it in your .env file or environment variables");
      process.exit(1);
    }
    
    // Test 2: Create/verify AuthUsers sheet
    console.log("\nTest 2: Creating/verifying AuthUsers sheet...");
    await createSheetIfNotExists("AuthUsers", ["ID", "Email", "Password", "Role"]);
    console.log("✅ AuthUsers sheet ready");
    
    // Test 3: Read from sheet
    console.log("\nTest 3: Reading from AuthUsers sheet...");
    const { headers, rows } = await readSheetValues("AuthUsers");
    console.log("✅ Successfully read from sheet");
    console.log("   Headers:", headers);
    console.log("   Rows:", rows.length);
    
    console.log("\n✅ All tests passed! Google Sheets is configured correctly.");
    console.log("\n📝 You can now start your server and create an admin account.");
    
  } catch (error) {
    console.error("\n❌ Test failed!");
    console.error("Error:", error.message);
    console.error("\nFull error details:");
    console.error(error);
    process.exit(1);
  }
}

testGoogleSheets();

