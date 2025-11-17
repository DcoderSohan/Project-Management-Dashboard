// backend/controllers/taskController.js
// Tasks CRUD + project progress recalculation

import {
  readSheetValues,
  appendRow,
  updateRow,
  deleteRowByIndex,
} from "../services/googleSheetService.js";
import { checkAndAutoCompleteProject } from "./projectController.js";
import { sendEmail } from "../utils/sendEmail.js";

const SHEET_NAME = "Tasks";
const TASK_HEADERS = [
  "ID",
  "ProjectID",
  "Title",
  "Description",
  "AssignedTo",
  "StartDate",
  "EndDate",
  "DueDate",
  "Status",
  "Attachments",
];

/**
 * Convert task object -> row array (match header order)
 */
function taskToRow(t) {
  return [
    t.id || "",
    t.projectId || "",
    t.title || "",
    t.description || "",
    t.assignedTo || "",
    t.startDate || "",
    t.endDate || "",
    t.dueDate || "",
    t.status || "Not Started",
    (t.attachments || []).join(", "),
  ];
}

/**
 * Convert row -> task object
 */
function rowToTask(row) {
  return {
    id: row[0] || "",
    projectId: row[1] || "",
    title: row[2] || "",
    description: row[3] || "",
    assignedTo: row[4] || "",
    startDate: row[5] || "",
    endDate: row[6] || "",
    dueDate: row[7] || "",
    status: row[8] || "Not Started",
    attachments: row[9] ? row[9].split(",").map((s) => s.trim()) : [],
  };
}

/**
 * Recalculate project progress and auto-complete if all tasks are Completed.
 * - progress = Math.round((completedTasks / totalTasks) * 100)
 * - if completedTasks === totalTasks => set project Status = "Completed" and progress = 100
 * Returns { wasJustCompleted: boolean, projectName: string, ownerEmail: string } if project was just completed
 */
async function recalcProjectProgress(projectId) {
  // Read tasks
  const { rows: taskRows } = await readSheetValues(SHEET_NAME);
  // filter rows for the project (rows array indexes do not include header)
  const projectTasks = (taskRows || []).filter((r) => r[1] === projectId);

  // compute
  const total = projectTasks.length;
  const completed = projectTasks.filter(
    (r) => (r[8] || "").toLowerCase() === "completed"
  ).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Update Projects sheet: find project row index and update Progress and Status
  const { rows: projectRows } = await readSheetValues("Projects");
  const projectIndex = (projectRows || []).findIndex((r) => r[0] === projectId);
  if (projectIndex === -1) {
    // project not found — nothing to update
    return null;
  }

  // read existing project row -> build new merged row
  const projRow = projectRows[projectIndex];
  const previousStatus = (projRow[6] || "").toLowerCase();
  const wasCompleted = completed === total && total !== 0;
  const updatedStatus = wasCompleted ? "Completed" : projRow[6] || "Not Started";
  const wasJustCompleted = wasCompleted && previousStatus !== "completed";

  // Build new project row (same order as header: ID, Name, Owner, Description, StartDate, EndDate, Status, Progress)
  const newProjectRow = [
    projRow[0] || "", // ID
    projRow[1] || "", // Name
    projRow[2] || "", // Owner
    projRow[3] || "", // Description
    projRow[4] || "", // StartDate
    projRow[5] || "", // EndDate
    updatedStatus, // Status
    progress.toString(), // Progress (string for sheet)
  ];

  // rowNumber in sheet = 1 (header) + projectIndex + 1
  const rowNumber = 1 + projectIndex + 1;
  await updateRow("Projects", rowNumber, newProjectRow);

  // Return completion info if project was just completed
  if (wasJustCompleted) {
    return {
      wasJustCompleted: true,
      projectName: projRow[1] || "",
      ownerEmail: projRow[2] || "", // Owner is at index 2
    };
  }

  return { wasJustCompleted: false };
}

/* ======================
     CRUD handlers
     ====================== */

// CREATE TASK
export const createTask = async (req, res) => {
  try {
    const t = req.body;
    if (!t.title)
      return res.status(400).json({ error: "Task title is required" });
    if (!t.projectId)
      return res.status(400).json({ error: "projectId is required" });

    // Generate unique ID: timestamp + random component
    t.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    t.status = t.status || "Not Started";
    t.attachments = t.attachments || [];

    await appendRow(SHEET_NAME, taskToRow(t));

    // recalc project progress after adding
    await recalcProjectProgress(t.projectId);

    // ✅ Send email notification to assigned employee
    if (t.assignedTo) {
      try {
        // Get project name for email context
        const { rows: projectRows } = await readSheetValues("Projects");
        const projectRow = (projectRows || []).find((r) => r[0] === t.projectId);
        const projectName = projectRow ? projectRow[1] : "Unknown Project";

        // Prepare email content
        const emailSubject = `🎯 New Task Assigned: ${t.title}`;
        let emailBody = `Hello,

You have been assigned a new task:

Task: ${t.title}
Project: ${projectName}
${t.description ? `Description: ${t.description}` : ""}
${t.dueDate ? `Due Date: ${t.dueDate}` : ""}
Status: ${t.status}`;

        // Add attachments information to email
        if (t.attachments && t.attachments.length > 0) {
          emailBody += `\n\nAttachments (${t.attachments.length} file(s)):`;
          t.attachments.forEach((url, index) => {
            emailBody += `\n${index + 1}. ${url}`;
          });
          emailBody += `\n\nAttachments are included with this email.`;
        }

        emailBody += `\n\nPlease check your dashboard for more details.

Best regards,
Project Management System`;

        // Send email with attachments
        await sendEmail(t.assignedTo, emailSubject, emailBody, t.attachments || []);
        console.log(`✅ Task assignment email sent to ${t.assignedTo}${t.attachments && t.attachments.length > 0 ? ` with ${t.attachments.length} attachment(s)` : ""}`);
      } catch (emailError) {
        // Log email error but don't fail the task creation
        console.error("❌ Error sending task assignment email:", emailError.message);
      }
    }

    return res.status(201).json({ message: "✅ Task created", task: t });
  } catch (err) {
    console.error("createTask error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// GET ALL TASKS (optionally filter by projectId via query ?projectId=xxx)
export const getAllTasks = async (req, res) => {
  try {
    const projectIdFilter = req.query.projectId;
    const { rows } = await readSheetValues(SHEET_NAME);
    const tasks = (rows || []).map((r) => rowToTask(r));
    const result = projectIdFilter
      ? tasks.filter((t) => t.projectId === projectIdFilter)
      : tasks;
    return res.status(200).json(result);
  } catch (err) {
    console.error("getAllTasks error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// GET TASK BY ID
export const getTaskById = async (req, res) => {
  try {
    const id = req.params.id;
    const { rows } = await readSheetValues(SHEET_NAME);
    const index = (rows || []).findIndex((r) => r[0] === id);
    if (index === -1) return res.status(404).json({ error: "Task not found" });
    const task = rowToTask(rows[index]);
    return res.status(200).json(task);
  } catch (err) {
    console.error("getTaskById error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// UPDATE TASK
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    // Read all tasks
    const { rows } = await readSheetValues(SHEET_NAME);
    const index = (rows || []).findIndex((r) => r[0] === id);

    if (index === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Get existing task
    const existing = rowToTask(rows[index]);
    
    // Merge updates
    const merged = {
      id: existing.id,
      projectId: update.projectId ?? existing.projectId,
      title: update.title ?? existing.title,
      description: update.description ?? existing.description,
      assignedTo: update.assignedTo ?? existing.assignedTo,
      startDate: update.startDate ?? existing.startDate,
      endDate: update.endDate ?? existing.endDate,
      dueDate: update.dueDate ?? existing.dueDate,
      status: update.status ?? existing.status,
      attachments: update.attachments ?? existing.attachments,
    };

    // Check if task was reassigned or newly assigned
    const wasReassigned = merged.assignedTo && merged.assignedTo !== existing.assignedTo;
    const wasNewlyAssigned = !existing.assignedTo && merged.assignedTo;

    // Calculate row number (1-based for Google Sheets)
    // rows already excludes header, so:
    // index 0 = first data row = sheet row 2 (row 1 is header)
    // rowNumber = index + 2 (1 for header + 1 for 0-based to 1-based conversion)
    const rowNumber = index + 2;
    await updateRow(SHEET_NAME, rowNumber, taskToRow(merged));

    // Recalculate project progress after task update
    const completionInfo = await recalcProjectProgress(merged.projectId);

    // ✅ Send email if task was assigned or reassigned
    if ((wasReassigned || wasNewlyAssigned) && merged.assignedTo) {
      try {
        // Get project name for email context
        const { rows: projectRows } = await readSheetValues("Projects");
        const projectRow = (projectRows || []).find((r) => r[0] === merged.projectId);
        const projectName = projectRow ? projectRow[1] : "Unknown Project";

        const emailSubject = wasReassigned 
          ? `🔄 Task Reassigned: ${merged.title}`
          : `🎯 Task Assigned: ${merged.title}`;
        
        let emailBody = wasReassigned
          ? `Hello,\n\nA task has been reassigned to you:\n\n`
          : `Hello,\n\nYou have been assigned a task:\n\n`;

        emailBody += `Task: ${merged.title}\nProject: ${projectName}\n${merged.description ? `Description: ${merged.description}\n` : ""}${merged.dueDate ? `Due Date: ${merged.dueDate}\n` : ""}Status: ${merged.status}`;

        // Add attachments information
        if (merged.attachments && merged.attachments.length > 0) {
          emailBody += `\n\nAttachments (${merged.attachments.length} file(s)):`;
          merged.attachments.forEach((url, idx) => {
            emailBody += `\n${idx + 1}. ${url}`;
          });
          emailBody += `\n\nAttachments are included with this email.`;
        }

        emailBody += `\n\nPlease check your dashboard for more details.\n\nBest regards,\nProject Management System`;

        await sendEmail(merged.assignedTo, emailSubject, emailBody, merged.attachments || []);
        console.log(`✅ Task assignment email sent to ${merged.assignedTo}${merged.attachments && merged.attachments.length > 0 ? ` with ${merged.attachments.length} attachment(s)` : ""}`);
      } catch (emailError) {
        console.error("❌ Error sending task assignment email:", emailError.message);
      }
    }

    // ✅ Send email if project was just completed
    if (completionInfo?.wasJustCompleted && completionInfo.ownerEmail) {
      await checkAndAutoCompleteProject(
        completionInfo.projectName,
        completionInfo.ownerEmail
      );
    }

    return res.status(200).json({ 
      message: "✅ Task updated successfully", 
      task: merged 
    });
  } catch (error) {
    console.error("❌ Error updating task:", error.message);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ 
      error: "Failed to update task",
      message: error.message 
    });
  }
};

// DELETE TASK
export const deleteTask = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "Task ID is required" });
    }

    const { rows } = await readSheetValues(SHEET_NAME);
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No tasks found" });
    }
    
    // Find the task - rows already excludes header (from readSheetValues)
    const index = (rows || []).findIndex((r) => r[0] === id);
    
    if (index === -1) {
      return res.status(404).json({ error: `Task with ID ${id} not found` });
    }

    // Get project id before deletion
    const projectId = rows[index][1] || "";

    console.log(`Deleting task at index ${index} (ID: ${id})`);

    // deleteRowByIndex expects 0-based index for data rows (excluding header)
    // Since readSheetValues already excludes header, index is already correct
    await deleteRowByIndex(SHEET_NAME, index);

    console.log(`Task deleted successfully (ID: ${id})`);

    // Recalc progress for that project if projectId exists
    if (projectId) {
      await recalcProjectProgress(projectId);
    }

    return res.status(200).json({ 
      message: "✅ Task deleted successfully",
      deletedId: id 
    });
  } catch (err) {
    console.error("deleteTask error:", err.message);
    console.error("Error stack:", err.stack);
    return res.status(500).json({ 
      error: "Failed to delete task", 
      message: err.message 
    });
  }
};
