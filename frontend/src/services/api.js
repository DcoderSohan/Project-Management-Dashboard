import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

// Log the API URL in development to help debug
if (import.meta.env.DEV) {
  console.log("🔗 API Base URL:", baseURL);
}

const api = axios.create({
  baseURL: baseURL,
  headers: { "Content-Type": "application/json" },
});

// Add auth token interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log("✅ API Response:", response.config?.url, response.status);
    }
    return response;
  },
  (error) => {
    // Log error for debugging
    console.error("❌ API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    if (error.response?.status === 404) {
      console.error("❌ API endpoint not found:", error.config?.url);
      console.error("Full error:", error);
    }
    
    // Handle network errors (no response from server)
    if (!error.response) {
      console.error("❌ Network error - No response from server");
      console.error("Request URL:", error.config?.baseURL + error.config?.url);
      console.error("This usually means:");
      console.error("  1. Backend server is not running");
      console.error("  2. CORS is blocking the request");
      console.error("  3. Network connectivity issue");
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid, clear it and redirect to login
      localStorage.removeItem("authToken");
      if (window.location.pathname !== "/login" && window.location.pathname !== "/signup") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
