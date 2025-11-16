import axios from "axios";

// Set backend URL - use environment variable or fallback to production URL
const getBaseURL = () => {
  // Priority 1: Environment variable (set in Render dashboard)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Priority 2: Production fallback (for deployed frontend)
  // Check if we're in production (not localhost)
  const isProduction = typeof window !== 'undefined' && 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1';
  
  if (isProduction) {
    return "https://project-management-dashboard-1-le5n.onrender.com/api";
  }
  
  // Priority 3: Development fallback (for local dev)
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
      console.error("This usually means:");
      console.error("  1. Backend server is not running");
      console.error("  2. CORS is blocking the request");
      console.error("  3. Network connectivity issue");
      console.error("  4. VITE_API_URL environment variable not set in production");
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
