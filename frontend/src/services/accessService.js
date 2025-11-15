import api from "./api";

// Share project with a user by email
export const shareProject = async (payload) => {
  const res = await api.post("/access/share", payload);
  return res.data;
};

// Generate shareable link for a project
export const generateShareLink = async (payload) => {
  const res = await api.post("/access/generate-link", payload);
  return res.data;
};

// Get all shares for a project
export const getProjectShares = async (projectId) => {
  const res = await api.get(`/access/project/${projectId}`);
  return res.data;
};

// Get all projects shared with a user
export const getUserSharedProjects = async (email) => {
  const res = await api.get(`/access/user/${email}`);
  return res.data;
};

// Update share permission
export const updateShare = async (id, payload) => {
  const res = await api.put(`/access/${id}`, payload);
  return res.data;
};

// Remove share (revoke access)
export const removeShare = async (id) => {
  const res = await api.delete(`/access/${id}`);
  return res.data;
};

// Get project by share token
export const getProjectByToken = async (token) => {
  const res = await api.get(`/access/token/${token}`);
  return res.data;
};

