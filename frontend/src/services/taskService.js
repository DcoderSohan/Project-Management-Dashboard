import api from "./api";

export const fetchTasks = async (projectId) => {
  const url = projectId ? `/tasks?projectId=${projectId}` : "/tasks";
  const res = await api.get(url);
  return res.data;
};

export const createTask = async (payload) => {
  const res = await api.post("/tasks", payload);
  return res.data;
};

export const updateTask = async (id, payload) => {
  const res = await api.put(`/tasks/${id}`, payload);
  return res.data;
};

export const deleteTask = async (id) => {
  const res = await api.delete(`/tasks/${id}`);
  return res.data;
};
