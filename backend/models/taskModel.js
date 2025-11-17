// backend/models/taskModel.js

export const taskFields = {
    id: "",
    projectId: "",         // Linked project ID
    title: "",
    description: "",
    assignedTo: "",        // User ID or name
    startDate: "",         // Task start date
    endDate: "",           // Task end date
    dueDate: "",
    status: "Not Started", // Not Started / In Progress / Completed
    attachments: [],       // File URLs if needed
  };
  
  // ✅ Validation helper
  export function validateTask(data) {
    if (!data.title) throw new Error("Task title is required");
    if (!data.projectId) throw new Error("Project ID is required for this task");
    return true;
  }
  