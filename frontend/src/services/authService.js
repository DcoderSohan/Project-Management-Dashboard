import api from "./api";

export const authService = {
  // Check if admin exists
  async checkAdminExists() {
    const res = await api.get("/auth/check-admin");
    return res.data;
  },

  // Sign up user (admin or normal user)
  async signup(email, password, role = "user") {
    const res = await api.post("/auth/signup", { email, password, role });
    return res.data;
  },

  // Login
  async login(email, password) {
    try {
      console.log("📡 Sending login request to /auth/login");
      console.log("📡 API Base URL:", api.defaults.baseURL);
      const res = await api.post("/auth/login", { email, password });
      console.log("📡 Login response status:", res.status);
      console.log("📡 Login response headers:", res.headers);
      console.log("📡 Login response data:", res.data);
      console.log("📡 Login response data type:", typeof res.data);
      console.log("📡 Login response data keys:", res.data ? Object.keys(res.data) : "null");
      
      // Validate response structure
      if (!res.data) {
        console.error("❌ Response data is null or undefined");
        throw new Error("Invalid response: No data received from server");
      }
      
      // Check if response contains error
      if (res.data.error && !res.data.token) {
        console.error("❌ Error in response:", res.data.error);
        throw new Error(res.data.error);
      }
      
      return res.data;
    } catch (error) {
      console.error("❌ Login request failed:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
      // Re-throw to let AuthContext handle it
      throw error;
    }
  },

  // Get current user
  async getCurrentUser(token) {
    try {
      const res = await api.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data.user;
    } catch (error) {
      console.error("Error getting current user:", error);
      throw error;
    }
  },

  // Update profile
  async updateProfile(token, profileData) {
    const res = await api.put(
      "/auth/profile",
      profileData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  },

  // Get all users (admin only)
  async getAllUsers(token) {
    const res = await api.get("/auth/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data;
  },

  // Create user (admin only)
  async createUser(token, userData) {
    const res = await api.post(
      "/auth/users",
      userData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  },

  // Update user (admin only)
  async updateUser(token, userId, userData) {
    const res = await api.put(
      `/auth/users/${userId}`,
      userData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.data;
  },

  // Delete user (admin only)
  async deleteUser(token, userId) {
    const res = await api.delete(`/auth/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data;
  },
};

