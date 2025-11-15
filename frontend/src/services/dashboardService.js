import api from "./api";

export const getDashboardData = async () => {
  try {
    console.log("Fetching dashboard data from /api/dashboard...");
    const response = await api.get("/dashboard");
    console.log("Dashboard data received:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    } else if (error.request) {
      console.error("No response received. Is the backend server running?");
    }
    throw error;
  }
};
