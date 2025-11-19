import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("authToken"));
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const userData = await authService.getCurrentUser(token);
          setUser(userData);
        } catch (error) {
          console.error("Error loading user:", error);
          // Only clear token if it's an authentication error (401/403), not network errors
          if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem("authToken");
            setToken(null);
          }
          // For network errors, keep the token but don't set user (will retry on next action)
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      console.log("🔐 Attempting login for:", email);
      const response = await authService.login(email, password);
      console.log("📦 Login response received:", response);
      console.log("📦 Response type:", typeof response);
      console.log("📦 Response keys:", response ? Object.keys(response) : "null/undefined");
      
      // Check if response is an error object (sometimes errors come as 200 with error field)
      if (response?.error) {
        console.error("❌ Error in response:", response.error);
        return { 
          success: false, 
          error: response.error || response.message || "Login failed"
        };
      }
      
      // Handle different response structures - check multiple possible locations
      const newToken = response?.token || response?.data?.token || response?.accessToken;
      const userData = response?.user || response?.data?.user || response?.userData;
      
      console.log("🔑 Extracted token:", newToken ? "Present (" + newToken.substring(0, 10) + "...)" : "Missing");
      console.log("👤 Extracted user:", userData ? "Present" : "Missing");
      
      if (!newToken) {
        console.error("❌ Token missing in response");
        console.error("Full response structure:", JSON.stringify(response, null, 2));
        // Check if this might be a successful response but with different structure
        if (response && typeof response === 'object') {
          console.error("Available keys in response:", Object.keys(response));
        }
        return { 
          success: false, 
          error: response?.error || response?.message || "Invalid response from server: Token missing. Please check backend connection." 
        };
      }
      
      if (!userData) {
        console.error("❌ User data missing in response");
        console.error("Full response structure:", JSON.stringify(response, null, 2));
        return { 
          success: false, 
          error: response?.error || response?.message || "Invalid response from server: User data missing. Please check backend connection." 
        };
      }
      
      // Store token
      localStorage.setItem("authToken", newToken);
      setToken(newToken);
      setUser(userData);
      
      console.log("✅ Login successful, user stored");
      return { success: true, user: userData };
    } catch (error) {
      console.error("❌ Login error caught:", error);
      console.error("Error type:", error.constructor.name);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      });
      
      // Handle network errors (no response from server)
      if (!error.response) {
        console.error("❌ Network error - No response received");
        const baseURL = error.config?.baseURL || import.meta.env.VITE_API_URL || "/api";
        const attemptedURL = baseURL + (error.config?.url || "");
        console.error("Attempted URL:", attemptedURL);
        console.error("Base URL from config:", error.config?.baseURL || "NOT SET");
        
        // Provide more helpful error message based on environment
        let errorMessage = "Cannot connect to server.";
        if (!import.meta.env.VITE_API_URL && import.meta.env.PROD) {
          errorMessage += " VITE_API_URL environment variable is not set. Please configure it in your deployment settings.";
        } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          errorMessage += " Please check if the backend server is running and accessible.";
        } else {
          errorMessage += " Please check your connection and try again.";
        }
        
        return { 
          success: false, 
          error: errorMessage
        };
      }
      
      // Handle different error response structures
      const errorData = error.response?.data;
      const errorMessage = errorData?.error || errorData?.message || error.message || "Login failed";
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const setAuth = (newToken, userData) => {
    if (newToken) {
      localStorage.setItem("authToken", newToken);
      setToken(newToken);
    }
    if (userData) {
      setUser(userData);
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    setAuth,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

