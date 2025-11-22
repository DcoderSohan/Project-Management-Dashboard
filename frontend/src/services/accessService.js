import api from "./api";

// Share project with a user by email
export const shareProject = async (payload) => {
  try {
    const res = await api.post("/access/share", payload);
    return res.data;
  } catch (error) {
    console.error("Error sharing project:", error);
    throw error;
  }
};

// Generate shareable link for a project
export const generateShareLink = async (payload) => {
  try {
    const res = await api.post("/access/generate-link", payload);
    return res.data;
  } catch (error) {
    console.error("Error generating share link:", error);
    throw error;
  }
};

// Get all shares for a project
export const getProjectShares = async (projectId) => {
  try {
    if (!projectId) {
      throw new Error("Project ID is required");
    }
    const res = await api.get(`/access/project/${projectId}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Error fetching project shares:", error);
    throw error;
  }
};

// Get all projects shared with a user
export const getUserSharedProjects = async (email) => {
  try {
    if (!email) {
      throw new Error("Email is required");
    }
    const res = await api.get(`/access/user/${email}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Error fetching shared projects:", error);
    throw error;
  }
};

// Update share permission
export const updateShare = async (id, payload) => {
  try {
    if (!id) {
      throw new Error("Share ID is required");
    }
    const res = await api.put(`/access/${id}`, payload);
    return res.data;
  } catch (error) {
    console.error("Error updating share:", error);
    throw error;
  }
};

// Remove share (revoke access)
export const removeShare = async (id) => {
  try {
    if (!id) {
      throw new Error("Share ID is required");
    }
    const res = await api.delete(`/access/${id}`);
    return res.data;
  } catch (error) {
    console.error("Error removing share:", error);
    throw error;
  }
};

// Get project by share token
export const getProjectByToken = async (token) => {
  try {
    if (!token) {
      throw new Error("Share token is required");
    }
    const res = await api.get(`/access/token/${token}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching project by token:", error);
    throw error;
  }
};

