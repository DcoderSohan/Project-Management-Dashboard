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
          // Token might be invalid, clear it
          localStorage.removeItem("authToken");
          setToken(null);
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
      
      // Handle different response structures - check multiple possible locations
      const newToken = response?.token || response?.data?.token || response?.accessToken;
      const userData = response?.user || response?.data?.user || response?.userData;
      
      console.log("🔑 Extracted token:", newToken ? "Present" : "Missing");
      console.log("👤 Extracted user:", userData ? "Present" : "Missing");
      
      if (!newToken) {
        console.error("❌ Token missing in response");
        console.error("Full response structure:", JSON.stringify(response, null, 2));
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
        return { 
          success: false, 
          error: "Cannot connect to server. Please check if the backend is running and accessible at: " + (error.config?.baseURL || "unknown URL")
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

