import api from "./api";

export const fetchUsers = async () => {
  const res = await api.get("/users");
  return res.data;
};

export const createUser = async (payload) => {
  const res = await api.post("/users", payload);
  return res.data;
};

export const updateUser = async (id, payload) => {
  const res = await api.put(`/users/${id}`, payload);
  return res.data;
};

export const deleteUser = async (id) => {
  const res = await api.delete(`/users/${id}`);
  return res.data;
};
