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
      const { token: newToken, user: userData } = response;
      
      if (!newToken || !userData) {
        return { success: false, error: "Invalid response from server" };
      }
      
      // Store token
      localStorage.setItem("authToken", newToken);
      setToken(newToken);
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error.response?.data?.error || error.message || "Login failed";
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

