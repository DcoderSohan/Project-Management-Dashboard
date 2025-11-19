import axios from "axios";

// Create a separate axios instance for profile photo uploads
const getProfileUploadBaseURL = () => {
  // Use environment variable (required in production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Development fallback (for local dev only)
  return "/api";
};

const profileUploadApi = axios.create({
  baseURL: getProfileUploadBaseURL(),
});

// Add auth token interceptor for uploads
profileUploadApi.interceptors.request.use(
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

export const uploadProfilePhoto = async (file) => {
  if (!file) {
    throw new Error("No file provided");
  }

  console.log("=== STARTING PROFILE PHOTO UPLOAD ===");
  console.log("File to upload:", { name: file.name, size: file.size, type: file.type });

  const formData = new FormData();
  formData.append("photo", file);
  
  try {
    console.log("Sending upload request to /api/profile-upload/profile-photo");
    const res = await profileUploadApi.post("/profile-upload/profile-photo", formData, {
      timeout: 60000, // 60 second timeout
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      },
    });
    
    console.log("Upload response received:", res.data);
    
    if (res.data && res.data.success && res.data.url) {
      console.log("=== PROFILE PHOTO UPLOAD SUCCESS ===");
      console.log("URL received:", res.data.url);
      return res.data.url;
    }
    
    throw new Error("No URL in response");
  } catch (error) {
    console.error("=== PROFILE PHOTO UPLOAD ERROR ===");
    console.error("Error object:", error);
    console.error("Error message:", error.message);
    
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
      const errorMessage = error.response.data?.error || error.response.data?.message || "Failed to upload profile photo";
      throw new Error(errorMessage);
    } else if (error.request) {
      console.error("No response received from server");
      throw new Error("No response from server. Please check if the backend is running.");
    } else {
      console.error("Error setting up request:", error.message);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
};

