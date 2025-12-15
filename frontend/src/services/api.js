import axios from "axios";

// Set backend URL - use environment variable or construct from current location
const getBaseURL = () => {
  // Priority 1: Use environment variable (required in production)
  if (import.meta.env.VITE_API_URL) {
    // Normalize and ensure it points to the /api root
    let envUrl = String(import.meta.env.VITE_API_URL).trim();

    // Remove any trailing slashes
    envUrl = envUrl.replace(/\/+$/, "");

    // If it doesn't already end with /api, append it
    if (!envUrl.toLowerCase().endsWith("/api")) {
      envUrl = `${envUrl}/api`;
    }

    return envUrl;
  }
  
  // Priority 2: In production, try to construct from current origin
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // If frontend and backend are on same domain (common on Render), use relative path
    // This works when both frontend and backend are served from the same service
    if (origin.includes('onrender.com') || origin.includes('vercel.app') || origin.includes('netlify.app')) {
      // For same-domain deployments, use relative path
      // The backend serves the frontend, so /api will work
      console.log("🔗 Using relative /api path (same-domain deployment detected)");
      return "/api";
    }
    
    // For other cases, try to use origin + /api as fallback
    // This assumes backend is on same domain but different path
    const fallbackURL = origin + "/api";
    console.warn("⚠️ VITE_API_URL not set in production. Using fallback:", fallbackURL);
    console.warn("⚠️ For best results, set VITE_API_URL environment variable in your deployment settings");
    return fallbackURL;
  }
  
  // Priority 3: Development fallback (for local dev only)
  // Vite proxy will handle /api -> http://localhost:5000/api
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

// Handle responses - check for HTML responses (catch-all route interference)
api.interceptors.response.use(
  (response) => {
    // Check if response is HTML (means catch-all route intercepted it)
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html') && typeof response.data === 'string') {
      console.error("❌ Received HTML response instead of JSON. API route may not be found.");
      console.error("Response preview:", response.data.substring(0, 200));
      console.error("Request URL:", response.config?.baseURL + response.config?.url);
      throw new Error("API endpoint not found. The request was intercepted by the frontend route. Please check VITE_API_URL environment variable.");
    }
    
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
      // Token expired or invalid, clear it and redirect to signup
      localStorage.removeItem("authToken");
      if (window.location.pathname !== "/login" && window.location.pathname !== "/signup") {
        window.location.href = "/signup";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
