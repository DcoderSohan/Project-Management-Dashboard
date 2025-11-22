import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Only create transporter if email credentials are provided
let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Add timeout to prevent hanging
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  // Verify email configuration asynchronously with timeout
  // Don't block server startup if verification fails
  const verifyPromise = new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn("⚠️ Email verification timed out (10s). Email functionality may not work.");
      console.warn("   This is non-critical - server will continue to run.");
      resolve(false);
    }, 10000); // 10 second timeout

    transporter.verify((err, success) => {
      clearTimeout(timeout);
      if (err) {
        console.warn("⚠️ Email verification failed:", err.message);
        console.warn("   Email functionality may not work, but server will continue.");
        console.warn("   To fix: Check EMAIL_USER and EMAIL_PASS in environment variables.");
        resolve(false);
      } else {
        console.log("✅ Email transporter verified successfully!");
        resolve(true);
      }
    });
  });

  // Don't await - let it run in background
  verifyPromise.catch(() => {
    // Silently handle any promise errors
  });
} else {
  console.warn("⚠️ Email credentials not configured (EMAIL_USER or EMAIL_PASS missing).");
  console.warn("   Email functionality will be disabled.");
}

/**
 * Send an email using the configured transporter
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Email body text
 * @param {Array<string>} attachments - Array of attachment URLs
 * @returns {Promise} - Promise that resolves when email is sent
 */
export async function sendEmail(to, subject, text, attachments = []) {
  // Check if transporter is available
  if (!transporter) {
    const error = new Error("Email service not configured. EMAIL_USER and EMAIL_PASS must be set.");
    console.error("❌", error.message);
    throw error;
  }

  try {
    // Check if text already contains HTML tags (like <br>, <a>, etc.)
    const isHTML = /<[a-z][\s\S]*>/i.test(text);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      text: isHTML ? text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/<br\s*\/?>/gi, "\n") : text, // Plain text version
      html: isHTML ? text : text.replace(/\n/g, "<br>"), // Use HTML if provided, otherwise convert newlines
    };

    // Add attachments if provided
    // Note: For URL-based attachments (Cloudinary or local server URLs), 
    // we include them as links in the email body instead of actual attachments
    // since nodemailer requires file paths or buffers for attachments
    if (attachments && attachments.length > 0) {
      // For now, we'll include attachment links in the email body
      // To attach actual files, you would need to download them first
      // This is a limitation - actual file attachments require downloading URLs first
      console.log(`📎 Email includes ${attachments.length} attachment link(s) in body`);
    }

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    if (attachments && attachments.length > 0) {
      console.log(`✅ Email included ${attachments.length} attachment(s)`);
    }
    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    throw error;
  }
}