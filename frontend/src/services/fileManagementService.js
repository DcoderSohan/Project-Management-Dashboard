import api from "./api";

export const fetchFiles = async (projectId = null, taskId = null) => {
  try {
    const params = new URLSearchParams();
    if (projectId) params.append("projectId", projectId);
    if (taskId) params.append("taskId", taskId);
    
    const url = `/file-management${params.toString() ? `?${params.toString()}` : ""}`;
    const res = await api.get(url);
    return res.data;
  } catch (error) {
    console.error("Error fetching files:", error);
    throw error;
  }
};

export const uploadFiles = async (files, projectId, taskId) => {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("projectId", projectId || "general");
    formData.append("taskId", taskId || "general");
    
    const res = await api.post("/file-management/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 120000, // 120 seconds
    });
    return res.data;
  } catch (error) {
    console.error("Error uploading files:", error);
    throw error;
  }
};

export const deleteFile = async (fileId, projectId, taskId) => {
  try {
    const params = new URLSearchParams();
    if (projectId) params.append("projectId", projectId);
    if (taskId) params.append("taskId", taskId);
    
    const url = `/file-management/${fileId}${params.toString() ? `?${params.toString()}` : ""}`;
    const res = await api.delete(url);
    return res.data;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

