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
      const response = await authService.login(email, password);
      console.log("Login response:", response);
      
      // Handle different response structures
      const newToken = response?.token || response?.data?.token;
      const userData = response?.user || response?.data?.user;
      
      if (!newToken || !userData) {
        console.error("Invalid login response structure:", response);
        return { 
          success: false, 
          error: response?.error || response?.message || "Invalid response from server. Please check backend connection." 
        };
      }
      
      // Store token
      localStorage.setItem("authToken", newToken);
      setToken(newToken);
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error("Login error:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      // Handle network errors
      if (!error.response) {
        return { 
          success: false, 
          error: "Cannot connect to server. Please check if the backend is running and accessible." 
        };
      }
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Login failed";
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

