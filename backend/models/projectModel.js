// backend/models/projectModel.js

// Local-only validation schema for Project data (no MongoDB)
export const projectFields = {
  id: "", // Auto-generated ID
  name: "", // Project title
  owner:"", //owner of the project
  description: "", // Project description
  startDate: "", // Start date
  endDate: "", // End date
  status: "Not Started", // Default status
  progress: 0, // Percentage of completion (0–100)
  tasks: [], // Related tasks (array of task IDs)
};

// ✅ Validation helper
export function validateProject(data) {
  if (!data.name) throw new Error("Project name is required");
  if (!data.startDate) throw new Error("Project start date is required");
  return true;
}
