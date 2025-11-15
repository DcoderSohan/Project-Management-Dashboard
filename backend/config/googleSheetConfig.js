// backend/config/googleSheetConfig.js

import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables (for Sheet ID, etc.)
dotenv.config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Path to your downloaded service account key
const SERVICE_ACCOUNT_KEY_FILE = "./config/google-service-account.json"; 
// (Rename this path if your JSON file name or location differs)

export async function getGoogleSheet() {
  try {
    // Check if key file exists
    if (!fs.existsSync(SERVICE_ACCOUNT_KEY_FILE)) {
      throw new Error("Google service account key file not found!");
    }

    // Create Google Auth instance using the service account credentials
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_KEY_FILE,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // Create Sheets client
    const sheets = google.sheets({ version: "v4", auth });

    console.log("✅ Google Sheets client configured successfully!");
    return { sheets, GOOGLE_SHEET_ID };

  } catch (error) {
    console.error("❌ Error configuring Google Sheets:", error.message);
    throw error;
  }
}
