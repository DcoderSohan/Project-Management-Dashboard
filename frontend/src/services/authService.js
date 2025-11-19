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
      
      // Handle case where response might be a string (HTML from catch-all route)
      let responseData = res.data;
      if (typeof responseData === 'string') {
        console.error("❌ Received HTML/string response instead of JSON. This usually means the API route was not found.");
        console.error("Response preview:", responseData.substring(0, 200));
        throw new Error("API endpoint not found. Please check VITE_API_URL environment variable.");
      }
      
      // Validate response structure
      if (!responseData || (typeof responseData === 'object' && Object.keys(responseData).length === 0)) {
        console.error("❌ Response data is null, undefined, or empty");
        throw new Error("Invalid response: No data received from server");
      }
      
      // Check if response contains error
      if (responseData.error && !responseData.token) {
        console.error("❌ Error in response:", responseData.error);
        throw new Error(responseData.error);
      }
      
      return responseData;
    } catch (error) {
      console.error("❌ Login request failed:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
      console.error("❌ Error config:", {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method
      });
      // Re-throw to let AuthContext handle it
      throw error;
    }
  },

  // Get current user
  async getCurrentUser(token) {
    try {
      // Token is already added by interceptor, but we can pass it explicitly too
      const res = await api.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Handle case where response might be a string (HTML from catch-all route)
      if (typeof res.data === 'string') {
        console.error("❌ Received HTML/string response instead of JSON for /auth/me");
        throw new Error("API endpoint not found. Please check VITE_API_URL environment variable.");
      }
      
      return res.data?.user || res.data;
    } catch (error) {
      console.error("Error getting current user:", error);
      console.error("Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
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

