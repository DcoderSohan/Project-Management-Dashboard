// backend/models/userModel.js

export const userFields = {
    id: "",
    name: "",
    email: "",
    role: "Employee",  // Admin or Employee
    assignedTasks: [], // Task IDs
  };
  
  // ✅ Validation helper
  export function validateUser(data) {
    if (!data.name) throw new Error("User name is required");
    if (!data.email) throw new Error("User email is required");
    return true;
  }
  