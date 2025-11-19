import axios from "axios";

// Set backend URL - use environment variable only
const getBaseURL = () => {
  // Use environment variable (required in production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Development fallback (for local dev only)
  return "/api";
};

const baseURL = getBaseURL();

// Log the API URL to help debug (both dev and production)
console.log("🔗 API Base URL:", baseURL);
console.log("🔗 Environment variable VITE_API_URL:", import.meta.env.VITE_API_URL || "NOT SET");
console.log("🔗 Using fallback:", !import.meta.env.VITE_API_URL ? "YES" : "NO");

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
      const attemptedURL = (error.config?.baseURL || "unknown") + (error.config?.url || "");
      console.error("Request URL:", attemptedURL);
      console.error("Base URL:", error.config?.baseURL || "NOT SET");
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("This usually means:");
      console.error("  1. Backend server is not running");
      console.error("  2. CORS is blocking the request");
      console.error("  3. Network connectivity issue");
      if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
        console.error("  4. ⚠️ VITE_API_URL environment variable not set in production - THIS IS REQUIRED!");
      }
      
      // Don't throw for network errors in some cases - let the component handle it
      // This prevents the app from crashing on initial load if backend is temporarily unavailable
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
