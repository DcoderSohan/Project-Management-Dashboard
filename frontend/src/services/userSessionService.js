import api from "./api";

// Get all logged-in users/sessions
export const getLoggedInUsers = async () => {
  const res = await api.get("/auth/sessions");
  return res.data;
};

// Track user login (for session tracking)
export const trackUserLogin = async (userData) => {
  // Token is automatically added by api interceptor
  const res = await api.post("/auth/login", userData);
  return res.data;
};

// Track user logout (for session tracking)
export const trackUserLogout = async (userId) => {
  // Token is automatically added by api interceptor
  const res = await api.post("/auth/logout", { userId });
  return res.data;
};
