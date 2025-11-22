import api from "./api";

export const fetchTasks = async (projectId) => {
  try {
    const url = projectId ? `/tasks?projectId=${projectId}` : "/tasks";
    const res = await api.get(url);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Error fetching tasks:", error);
    throw error;
  }
};

export const createTask = async (payload) => {
  try {
    const res = await api.post("/tasks", payload);
    return res.data;
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
};

export const updateTask = async (id, payload) => {
  try {
    if (!id) {
      throw new Error("Task ID is required");
    }
    const res = await api.put(`/tasks/${id}`, payload);
    return res.data;
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

export const deleteTask = async (id) => {
  try {
    if (!id) {
      throw new Error("Task ID is required");
    }
    const res = await api.delete(`/tasks/${id}`);
    return res.data;
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
};
