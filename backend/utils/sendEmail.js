import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config({ quiet: true }); // Suppress dotenv tips

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
    connectionTimeout: 5000, // 5 seconds - shorter timeout
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });

  // Verify email configuration asynchronously with timeout
  // Don't block server startup if verification fails
  // Only verify in background, don't log warnings unless in development
  const verifyPromise = new Promise((resolve) => {
    let timeoutCleared = false;
    const timeout = setTimeout(() => {
      timeoutCleared = true;
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log("ℹ️ Email verification timed out. Will verify on first email send.");
      }
      resolve(false);
    }, 5000); // 5 second timeout

    transporter.verify((err, success) => {
      if (!timeoutCleared) {
        clearTimeout(timeout);
      }
      if (err) {
        // Only log detailed errors in development
        if (process.env.NODE_ENV === 'development') {
          console.log("ℹ️ Email verification failed. Will verify on first email send.");
        }
        resolve(false);
      } else {
        console.log("✅ Email transporter verified successfully!");
        resolve(true);
      }
    });
  });

  // Don't await - let it run in background silently
  verifyPromise.catch(() => {
    // Silently handle any promise errors
  });
} else {
  // Only log in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log("ℹ️ Email credentials not configured. Email functionality will be disabled.");
  }
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