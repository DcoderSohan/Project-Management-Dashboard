// backend/models/accessModel.js

// Access/Share data structure for projects
export const accessFields = {
  id: "", // Auto-generated ID
  projectId: "", // Project being shared
  sharedWith: "", // Email of user being shared with
  sharedWithName: "", // Name of user (optional)
  permission: "viewer", // "viewer" or "editor"
  sharedBy: "", // Email of person who shared
  sharedByName: "", // Name of person who shared
  shareToken: "", // Unique token for shareable links
  createdAt: "", // Timestamp when shared
  expiresAt: "", // Optional expiration date
};

// Permission types
export const PERMISSIONS = {
  VIEWER: "viewer", // Can view only
  EDITOR: "editor", // Can view and edit
};

// Validation helper
export function validateAccess(data) {
  if (!data.projectId) throw new Error("Project ID is required");
  if (!data.sharedWith && !data.shareToken) {
    throw new Error("Either sharedWith email or shareToken is required");
  }
  if (data.permission && !Object.values(PERMISSIONS).includes(data.permission)) {
    throw new Error(`Invalid permission. Must be one of: ${Object.values(PERMISSIONS).join(", ")}`);
  }
  return true;
}

// Generate unique share token
export function generateShareToken() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
}

