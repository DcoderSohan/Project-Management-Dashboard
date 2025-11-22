import api from "./api";

export const fetchUsers = async () => {
  try {
    const res = await api.get("/users");
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const createUser = async (payload) => {
  try {
    const res = await api.post("/users", payload);
    return res.data;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const updateUser = async (id, payload) => {
  try {
    if (!id) {
      throw new Error("User ID is required");
    }
    const res = await api.put(`/users/${id}`, payload);
    return res.data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const deleteUser = async (id) => {
  try {
    if (!id) {
      throw new Error("User ID is required");
    }
    const res = await api.delete(`/users/${id}`);
    return res.data;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};
