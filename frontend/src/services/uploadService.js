import axios from "axios";

// Create a separate axios instance for file uploads without default Content-Type
const getUploadBaseURL = () => {
  // Use environment variable (required in production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Development fallback (for local dev only)
  return "/api";
};

const uploadApi = axios.create({
  baseURL: getUploadBaseURL(),
  // Don't set Content-Type - axios will automatically set it with boundary for FormData
});

// Add auth token interceptor for uploads
uploadApi.interceptors.request.use(
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

export const uploadFiles = async (files) => {
  if (!files || files.length === 0) {
    console.log("No files to upload");
    return [];
  }

  console.log("=== STARTING FILE UPLOAD ===");
  console.log("Files to upload:", files.map(f => ({ name: f.name, size: f.size, type: f.type })));

  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append("files", file);
    console.log(`Added file ${index + 1}: ${file.name} (${file.size} bytes)`);
  });
  
  try {
    console.log("Sending upload request to /upload");
    console.log("Base URL:", uploadApi.defaults.baseURL);
    console.log("FormData entries:", Array.from(formData.entries()).map(([key, value]) => 
      [key, value instanceof File ? { name: value.name, size: value.size, type: value.type } : value]
    ));
    
    // Axios will automatically set Content-Type: multipart/form-data with boundary for FormData
    // DO NOT set Content-Type manually - let axios set it with the boundary
    const res = await uploadApi.post("/upload", formData, {
      timeout: 120000, // 120 second timeout for large files
      maxContentLength: 50 * 1024 * 1024, // 50MB max content length
      maxBodyLength: 50 * 1024 * 1024, // 50MB max body length
      // Remove explicit Content-Type header - axios will set it automatically with boundary
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      },
    });
    
    console.log("Upload response received:", res.data);
    
    if (res.data && res.data.urls && Array.isArray(res.data.urls)) {
      console.log("=== UPLOAD SUCCESS ===");
      console.log("URLs received:", res.data.urls);
      return res.data.urls;
    }
    
    console.warn("No URLs in response:", res.data);
    return [];
  } catch (error) {
    console.error("=== UPLOAD SERVICE ERROR ===");
    console.error("Error object:", error);
    console.error("Error message:", error.message);
    
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
      
      // Handle authentication errors
      if (error.response.status === 401) {
        const errorMessage = error.response.data?.error || error.response.data?.message || "Authentication required";
        throw new Error(`${errorMessage}. Please login again.`);
      }
      
      // Handle other HTTP errors
      const errorMessage = error.response.data?.error || error.response.data?.message || "Failed to upload files";
      const errorDetails = error.response.data?.details ? `\nDetails: ${error.response.data.details}` : "";
      throw new Error(`${errorMessage}${errorDetails}`);
    } else if (error.request) {
      console.error("No response received from server");
      console.error("Request config:", error.config);
      throw new Error("No response from server. Please check if the backend is running and you are connected to the internet.");
    } else {
      console.error("Error setting up request:", error.message);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
};

