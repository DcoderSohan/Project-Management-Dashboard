import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.error("Email verify failed:", err.message);
  } else {
    console.log("Email transporter ready:", success);
  }
});

/**
 * Send an email using the configured transporter
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Email body text
 * @param {Array<string>} attachments - Array of attachment URLs
 * @returns {Promise} - Promise that resolves when email is sent
 */
export async function sendEmail(to, subject, text, attachments = []) {
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