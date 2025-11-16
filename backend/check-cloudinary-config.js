// Check Cloudinary Configuration
// Run this script to verify your Cloudinary setup: node check-cloudinary-config.js

import dotenv from "dotenv";
dotenv.config();

console.log("🔍 Checking Cloudinary Configuration...\n");

const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

let allSet = true;

console.log("Environment Variables:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

if (cloudinaryConfig.cloud_name) {
  if (cloudinaryConfig.cloud_name === "your_cloud_name_here" || cloudinaryConfig.cloud_name.includes("your_")) {
    console.log("❌ CLOUDINARY_CLOUD_NAME: Placeholder value detected");
    console.log("   Current: " + cloudinaryConfig.cloud_name);
    allSet = false;
  } else {
    console.log("✅ CLOUDINARY_CLOUD_NAME: Set (" + cloudinaryConfig.cloud_name.substring(0, 4) + "****)");
  }
} else {
  console.log("❌ CLOUDINARY_CLOUD_NAME: Not set");
  allSet = false;
}

if (cloudinaryConfig.api_key) {
  if (cloudinaryConfig.api_key === "your_api_key_here" || cloudinaryConfig.api_key.includes("your_")) {
    console.log("❌ CLOUDINARY_API_KEY: Placeholder value detected");
    console.log("   Current: " + cloudinaryConfig.api_key);
    allSet = false;
  } else {
    console.log("✅ CLOUDINARY_API_KEY: Set (" + cloudinaryConfig.api_key.substring(0, 4) + "****)");
  }
} else {
  console.log("❌ CLOUDINARY_API_KEY: Not set");
  allSet = false;
}

if (cloudinaryConfig.api_secret) {
  if (cloudinaryConfig.api_secret === "your_api_secret_here" || cloudinaryConfig.api_secret.includes("your_")) {
    console.log("❌ CLOUDINARY_API_SECRET: Placeholder value detected");
    console.log("   Current: " + cloudinaryConfig.api_secret.substring(0, 10) + "****");
    allSet = false;
  } else {
    console.log("✅ CLOUDINARY_API_SECRET: Set (" + cloudinaryConfig.api_secret.substring(0, 4) + "****)");
  }
} else {
  console.log("❌ CLOUDINARY_API_SECRET: Not set");
  allSet = false;
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

if (allSet) {
  console.log("✅ All Cloudinary credentials are properly configured!");
  console.log("✅ Your app will use Cloudinary for file uploads.");
} else {
  console.log("⚠️  Cloudinary credentials are missing or contain placeholder values.");
  console.log("\n📝 To fix this:");
  console.log("   1. Sign up at: https://cloudinary.com/users/register/free");
  console.log("   2. Get your credentials from the Dashboard");
  console.log("   3. Update backend/.env file with your actual credentials");
  console.log("   4. Restart your server");
  console.log("\n💡 Your app will use local storage until Cloudinary is configured.");
}

console.log("\n");

