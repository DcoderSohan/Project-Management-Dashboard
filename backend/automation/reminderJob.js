import cron from "node-cron";
import { readSheetValues } from "../services/googleSheetService.js";
import { sendEmail } from "../utils/sendEmail.js";
import dotenv from "dotenv";
dotenv.config();

/**
 * Send task reminder emails
 * Sends reminders 2 days before and 2 days after due date
 * @returns {Promise<{success: boolean, remindersSent: number, message: string}>}
 */
export async function sendTaskReminders() {
  try {
    console.log("📅 Checking tasks for reminder emails...");

    // Read all tasks
    const { rows: taskRows } = await readSheetValues("Tasks");
    
    if (!taskRows || taskRows.length === 0) {
      const message = "No tasks found.";
      console.log(message);
      return { success: true, remindersSent: 0, message };
    }

    // Read all projects to map project IDs to names
    const { rows: projectRows } = await readSheetValues("Projects");
    const projectMap = {};
    (projectRows || []).forEach((row) => {
      const projectId = row[0]; // ID
      const projectName = row[1]; // Name
      projectMap[projectId] = projectName;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    let remindersSent = 0;
    const reminders = [];

    // Task columns: ID, ProjectID, Title, Description, AssignedTo, DueDate, Status, Attachments
    for (const row of taskRows) {
      const taskId = row[0] || ""; // ID
      const projectId = row[1] || ""; // ProjectID
      const title = row[2] || ""; // Title
      const description = row[3] || ""; // Description
      const assignedTo = row[4] || ""; // AssignedTo (email)
      const dueDate = row[5] || ""; // DueDate
      const status = (row[6] || "Not Started").trim(); // Status

      // Skip if no due date, no assigned email, or task is completed
      if (!dueDate || !assignedTo || status.toLowerCase() === "completed") {
        continue;
      }

      try {
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0); // Reset time to start of day

        // Calculate difference in days
        const diffTime = due - today;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const projectName = projectMap[projectId] || projectId;

        // Send reminder 2 days BEFORE due date
        if (diffDays === 2) {
          const subject = `⏰ Reminder: Task "${title}" is due in 2 days`;
          const text = `Hello,

This is a friendly reminder that your task is due in 2 days:

Task: ${title}
Project: ${projectName}
Due Date: ${dueDate}
Status: ${status}
${description ? `Description: ${description}` : ""}

Please make sure to complete this task on time.

Best regards,
Project Management System`;

          await sendEmail(assignedTo, subject, text);
          console.log(`📧 Sent 2-day reminder for task "${title}" to ${assignedTo}`);
          remindersSent++;
          reminders.push({
            type: "2-day-before",
            task: title,
            email: assignedTo,
            dueDate: dueDate,
          });
        }

        // Send reminder 2 days AFTER due date (overdue)
        if (diffDays === -2) {
          const subject = `⚠️ Overdue Reminder: Task "${title}" is 2 days overdue`;
          const text = `Hello,

This is an important reminder that your task is now 2 days overdue:

Task: ${title}
Project: ${projectName}
Due Date: ${dueDate} (2 days ago)
Status: ${status}
${description ? `Description: ${description}` : ""}

Please update the task status or complete it as soon as possible.

Best regards,
Project Management System`;

          await sendEmail(assignedTo, subject, text);
          console.log(`📧 Sent overdue reminder for task "${title}" to ${assignedTo}`);
          remindersSent++;
          reminders.push({
            type: "2-day-overdue",
            task: title,
            email: assignedTo,
            dueDate: dueDate,
          });
        }
      } catch (dateError) {
        console.warn(`⚠️ Invalid due date for task ${taskId}: ${dueDate}`, dateError.message);
        continue;
      }
    }

    const message = `Reminder job completed. Sent ${remindersSent} reminder(s).`;
    console.log(`✅ ${message}`);
    return { success: true, remindersSent, reminders, message };
  } catch (error) {
    const errorMessage = `Reminder job failed: ${error.message}`;
    console.error("❌", errorMessage);
    console.error("Error stack:", error.stack);
    return { success: false, remindersSent: 0, error: error.message, message: errorMessage };
  }
}

// Schedule job: runs every day at 9 AM
cron.schedule("0 9 * * *", async () => {
  await sendTaskReminders();
});

console.log("✅ Task reminder job scheduled (runs daily at 9:00 AM)");
