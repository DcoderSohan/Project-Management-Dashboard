import api from "./api"; // your axios instance (baseURL /)

export const fetchProjects = async () => {
  try {
    const res = await api.get("/projects");
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
};

export const createProject = async (payload) => {
  try {
    const res = await api.post("/projects", payload);
    return res.data;
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
};

export const updateProject = async (id, payload) => {
  try {
    if (!id) {
      throw new Error("Project ID is required");
    }
    const res = await api.put(`/projects/${id}`, payload);
    return res.data;
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
};

export const deleteProject = async (id) => {
  try {
    if (!id) {
      throw new Error("Project ID is required");
    }
    const res = await api.delete(`/projects/${id}`);
    return res.data;
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
};
