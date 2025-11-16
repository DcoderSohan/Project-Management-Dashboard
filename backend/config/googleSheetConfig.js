// backend/config/googleSheetConfig.js

import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables (for Sheet ID, etc.)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Path to your downloaded service account key
const SERVICE_ACCOUNT_KEY_FILE = path.join(__dirname, "google-service-account.json");

export async function getGoogleSheet() {
  try {
    let auth;
    
    // Debug logging
    console.log("🔍 Checking for Google service account credentials...");
    console.log("   Environment variable GOOGLE_SERVICE_ACCOUNT_JSON:", process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? "SET" : "NOT SET");
    console.log("   File path:", SERVICE_ACCOUNT_KEY_FILE);
    console.log("   File exists:", fs.existsSync(SERVICE_ACCOUNT_KEY_FILE));
    
    // Priority 1: Check if service account credentials are in environment variables (for production)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.log("📝 Using Google service account from environment variable");
      try {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        auth = new google.auth.GoogleAuth({
          credentials: credentials,
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        console.log("✅ Google Auth configured from environment variable");
      } catch (parseError) {
        console.error("❌ Error parsing GOOGLE_SERVICE_ACCOUNT_JSON:", parseError.message);
        throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON format. Must be valid JSON.");
      }
    }
    // Priority 2: Check if key file exists (for local development)
    else if (fs.existsSync(SERVICE_ACCOUNT_KEY_FILE)) {
      console.log("📝 Using Google service account from key file");
      console.log("   File path:", SERVICE_ACCOUNT_KEY_FILE);
      auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_KEY_FILE,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      console.log("✅ Google Auth configured from key file");
    }
    // No credentials found
    else {
      console.error("❌ Google service account credentials not found!");
      console.error("   Checked environment variable: GOOGLE_SERVICE_ACCOUNT_JSON");
      console.error("   Checked file path:", SERVICE_ACCOUNT_KEY_FILE);
      console.error("   File exists:", fs.existsSync(SERVICE_ACCOUNT_KEY_FILE));
      
      const errorMsg = `Google service account credentials not found!

Please provide credentials using one of these methods:

Method 1 (Recommended for Production - Render):
  Set environment variable: GOOGLE_SERVICE_ACCOUNT_JSON
  Value: The entire JSON content of your service account key file
  Location: Render Dashboard → Your Backend Service → Environment → Add Variable
  
Method 2 (For Local Development):
  Place your service account key file at: ${SERVICE_ACCOUNT_KEY_FILE}
  
To get your service account key:
  1. Go to Google Cloud Console (https://console.cloud.google.com/)
  2. Navigate to IAM & Admin → Service Accounts
  3. Create or select a service account
  4. Download the JSON key file
  5. Either:
     - Place it at: backend/config/google-service-account.json (for local)
     - Or set GOOGLE_SERVICE_ACCOUNT_JSON environment variable with the JSON content (for production)

Current file path being checked: ${SERVICE_ACCOUNT_KEY_FILE}
File exists: ${fs.existsSync(SERVICE_ACCOUNT_KEY_FILE)}
`;
      throw new Error(errorMsg);
    }

    // Create Sheets client
    const sheets = google.sheets({ version: "v4", auth });

    console.log("✅ Google Sheets client configured successfully!");
    return { sheets, GOOGLE_SHEET_ID };

  } catch (error) {
    console.error("❌ Error configuring Google Sheets:", error.message);
    throw error;
  }
}
