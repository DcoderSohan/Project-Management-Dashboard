import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Check if environment variables are set
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error("❌ Error: EMAIL_USER and EMAIL_PASS must be set in your .env file");
  console.error("   Please add the following to your .env file:");
  console.error("   EMAIL_USER=your-email@gmail.com");
  console.error("   EMAIL_PASS=your-app-password");
  console.error("\n   Note: For Gmail, you need to use an App Password, not your regular password.");
  console.error("   Get one at: https://myaccount.google.com/apppasswords");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

console.log("🔍 Verifying email configuration...");
console.log(`   Email: ${process.env.EMAIL_USER}`);
console.log(`   Password: ${process.env.EMAIL_PASS ? "***" + process.env.EMAIL_PASS.slice(-4) : "NOT SET"}\n`);

transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Email verification failed!");
    console.error("   Error:", err.message);
    console.error("\n   Common issues:");
    console.error("   1. Using regular Gmail password instead of App Password");
    console.error("   2. App Password not generated or expired");
    console.error("   3. 2-Step Verification not enabled on Gmail account");
    console.error("   4. Incorrect email or password in .env file");
    console.error("\n   Solution:");
    console.error("   1. Enable 2-Step Verification: https://myaccount.google.com/security");
    console.error("   2. Generate App Password: https://myaccount.google.com/apppasswords");
    console.error("   3. Use the 16-character App Password (no spaces) in EMAIL_PASS");
    process.exit(1);
  } else {
    console.log("✅ Email transporter verified successfully!");
    console.log("   Server is ready to send emails.");
    process.exit(0);
  }
});

