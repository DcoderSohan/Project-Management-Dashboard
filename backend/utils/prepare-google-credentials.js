// Helper script to prepare Google service account JSON for environment variable
// Run: node backend/utils/prepare-google-credentials.js
// This will output the JSON content that you can paste into Render's GOOGLE_SERVICE_ACCOUNT_JSON

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_ACCOUNT_KEY_FILE = path.join(__dirname, "../config/google-service-account.json");

try {
  if (!fs.existsSync(SERVICE_ACCOUNT_KEY_FILE)) {
    console.error("❌ Service account file not found at:", SERVICE_ACCOUNT_KEY_FILE);
    console.error("Please make sure the file exists at: backend/config/google-service-account.json");
    process.exit(1);
  }

  const fileContent = fs.readFileSync(SERVICE_ACCOUNT_KEY_FILE, "utf8");
  const jsonData = JSON.parse(fileContent); // Validate it's valid JSON
  
  console.log("✅ Service account file found and valid!");
  console.log("📧 Service Account Email:", jsonData.client_email);
  console.log("\n" + "=".repeat(80));
  console.log("Copy the content below and paste it into Render's GOOGLE_SERVICE_ACCOUNT_JSON:");
  console.log("=".repeat(80) + "\n");
  console.log(fileContent);
  console.log("\n" + "=".repeat(80));
  console.log("\n📝 Instructions:");
  console.log("1. Copy the JSON content above (everything between the === lines)");
  console.log("2. Go to Render Dashboard → Your Backend Service → Environment");
  console.log("3. Add new variable:");
  console.log("   Key: GOOGLE_SERVICE_ACCOUNT_JSON");
  console.log("   Value: Paste the entire JSON content");
  console.log("4. Save and redeploy");
  console.log("\n⚠️  Make sure to share your Google Sheet with this email:");
  console.log("   " + jsonData.client_email);
  
} catch (error) {
  console.error("❌ Error reading service account file:", error.message);
  process.exit(1);
}

