// backend/controllers/projectController.js
import {
  readSheetValues,
  appendRow,
  updateRow,
  deleteRowByIndex,
} from "../services/googleSheetService.js";
import { validateProject } from "../models/projectModel.js";
import { sendEmail } from "../utils/sendEmail.js";
import { recalcProjectProgress } from "./taskController.js";

/**
 * Assumptions:
 * - Your Google Sheet has a tab named "Projects"
 * - Row 1 is header, e.g. columns:
 *   ID | Name | Owner | Description | StartDate | EndDate | Status | Progress
 */

// adjust sheet/tab name and headers as your sheet uses
const SHEET_NAME = "Projects";
const HEADER_COLUMNS = [
  "ID",
  "Name",
  "Owner",
  "Description",
  "StartDate",
  "EndDate",
  "Status",
  "Progress",
];

// helper: convert object into row array
function projectToRow(p) {
  return [
    p.id || "",
    p.name || "",
    p.owner || "",
    p.description || "",
    p.startDate || "",
    p.endDate || "",
    p.status || "Not Started",
    p.progress !== undefined ? p.progress : 0,
  ];
}

// helper: convert row array to object using header columns
function rowToProject(row) {
  const obj = {};
  for (let i = 0; i < HEADER_COLUMNS.length; i++) {
    obj[HEADER_COLUMNS[i]] = row[i] || "";
  }
  // map to friendlier keys
  return {
    id: obj.ID,
    name: obj.Name,
    owner: obj.Owner || "",
    description: obj.Description,
    startDate: obj.StartDate,
    endDate: obj.EndDate,
    status: obj.Status,
    progress: Number(obj.Progress) || 0,
  };
}

// CREATE
export const createProject = async (req, res) => {
  try {
    const data = req.body;
    validateProject(data);

    // Generate unique ID: timestamp + random component
    data.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Status and progress are automatically calculated from tasks
    // Set initial values, will be recalculated when tasks are added
    data.status = "Not Started";
    data.progress = 0;

    const row = projectToRow(data);
    await appendRow(SHEET_NAME, row);

    return res
      .status(201)
      .json({ 
        message: "✅ Project created. Status and progress will be automatically calculated from tasks.", 
        project: data 
      });
  } catch (err) {
    console.error("createProject error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// READ ALL
export const getAllProjects = async (req, res) => {
  try {
    const { headers, rows } = await readSheetValues(SHEET_NAME);
    if (!rows || rows.length === 0) return res.status(200).json([]);

    const projects = rows.map((r) => rowToProject(r));
    return res.status(200).json(projects);
  } catch (err) {
    console.error("getAllProjects error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// READ ONE
export const getProjectById = async (req, res) => {
  try {
    const id = req.params.id;
    const { rows } = await readSheetValues(SHEET_NAME);

    const index = rows.findIndex((r) => r[0] === id); // ID is column A (index 0)
    if (index === -1)
      return res.status(404).json({ error: "Project not found" });

    const project = rowToProject(rows[index]);
    return res.status(200).json(project);
  } catch (err) {
    console.error("getProjectById error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// UPDATE
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const { rows } = await readSheetValues(SHEET_NAME);
    const index = (rows || []).findIndex((r) => r[0] === id);

    if (index === -1)
      return res.status(404).json({ error: "Project not found" });

    const existing = rowToProject(rows[index]);
    
    // IMPORTANT: Status and progress are automatically calculated from tasks
    // Do NOT allow manual updates to status/progress - they are read-only
    // Only allow updates to: name, owner, description, startDate, endDate
    
    // merge updates (excluding status and progress - these are auto-calculated)
    const merged = {
      id: existing.id,
      name: update.name ?? existing.name,
      owner: update.owner ?? existing.owner,
      description: update.description ?? existing.description,
      startDate: update.startDate ?? existing.startDate,
      endDate: update.endDate ?? existing.endDate,
      // Status and progress are NOT updated here - they come from task completion
      status: existing.status, // Keep existing, will be recalculated
      progress: existing.progress, // Keep existing, will be recalculated
    };

    // compute row number = header(1) + index + 1
    const rowNumber = 1 + index + 1;
    await updateRow(SHEET_NAME, rowNumber, projectToRow(merged));

    // Recalculate project status and progress from tasks after update
    // Status and progress are ALWAYS calculated from tasks, never manually set
    await recalcProjectProgress(id);

    // Get updated project data
    const { rows: updatedRows } = await readSheetValues(SHEET_NAME);
    const updatedProject = rowToProject(updatedRows[index]);

    return res
      .status(200)
      .json({ 
        message: "✅ Project updated successfully! Status and progress are automatically calculated from tasks.", 
        project: updatedProject 
      });
  } catch (err) {
    console.error("updateProject error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// DELETE
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    const { rows } = await readSheetValues(SHEET_NAME);
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No projects found" });
    }

    const index = (rows || []).findIndex((r) => r[0] === id);

    if (index === -1) {
      return res.status(404).json({ error: `Project with ID ${id} not found` });
    }

    console.log(`Deleting project at index ${index} (ID: ${id})`);

    await deleteRowByIndex(SHEET_NAME, index);

    console.log(`Project deleted successfully (ID: ${id})`);

    return res.status(200).json({ message: "🗑 Project deleted successfully!" });
  } catch (err) {
    console.error("deleteProject error:", err.message);
    console.error("Error stack:", err.stack);
    return res.status(500).json({ error: "Failed to delete project", message: err.message });
  }
};


export const checkAndAutoCompleteProject = async (projectName, ownerEmail) => {
  try {
    // Send notification email (project status is already updated by recalcProjectProgress)
    if (ownerEmail) {
      await sendEmail(
        ownerEmail,
        "✅ Project Completed!",
        `All tasks for project "${projectName}" are done. The project has been marked as Completed!`
      );
      console.log(`🎉 Email sent to ${ownerEmail} - Project "${projectName}" completed`);
    }
  } catch (error) {
    console.error("❌ Error sending completion email:", error.message);
  }
};