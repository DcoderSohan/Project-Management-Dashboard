import React, { useState, useEffect } from "react";
import { fetchFiles, uploadFiles, deleteFile } from "../services/fileManagementService";
import { fetchProjects } from "../services/projectService";
import { fetchTasks } from "../services/taskService";

export default function FileManagement() {
  const [files, setFiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadTasks(selectedProject);
      loadFiles(selectedProject, selectedTask);
    } else {
      loadFiles();
    }
  }, [selectedProject, selectedTask]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, filesData] = await Promise.all([
        fetchProjects(),
        fetchFiles(),
      ]);
      setProjects(projectsData || []);
      setFiles(filesData?.files || []);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (projectId) => {
    try {
      const tasksData = await fetchTasks(projectId);
      setTasks(tasksData || []);
    } catch (err) {
      console.error("Error loading tasks:", err);
    }
  };

  const loadFiles = async (projectId = null, taskId = null) => {
    try {
      setLoading(true);
      const data = await fetchFiles(projectId, taskId);
      setFiles(data?.files || []);
    } catch (err) {
      console.error("Error loading files:", err);
      setError(err.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select files to upload");
      return;
    }

    try {
      setUploading(true);
      const projectId = selectedProject || "general";
      const taskId = selectedTask || "general";
      
      await uploadFiles(selectedFiles, projectId, taskId);
      alert(`Successfully uploaded ${selectedFiles.length} file(s)`);
      setSelectedFiles([]);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";
      
      // Reload files
      await loadFiles(selectedProject || null, selectedTask || null);
    } catch (err) {
      console.error("Error uploading files:", err);
      alert(`Failed to upload files: ${err.message || "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    try {
      await deleteFile(file.id, file.projectId, file.taskId);
      alert("File deleted successfully");
      await loadFiles(selectedProject || null, selectedTask || null);
    } catch (err) {
      console.error("Error deleting file:", err);
      alert(`Failed to delete file: ${err.message || "Unknown error"}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  // Group files by project and task
  const groupedFiles = files.reduce((acc, file) => {
    const projectId = file.projectId || "general";
    const taskId = file.taskId || "general";
    
    if (!acc[projectId]) {
      acc[projectId] = {};
    }
    if (!acc[projectId][taskId]) {
      acc[projectId][taskId] = [];
    }
    acc[projectId][taskId].push(file);
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">File Management</h1>
        <p className="text-gray-600">Upload and manage files organized by project and task</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project (Optional)
            </label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setSelectedTask(""); // Reset task when project changes
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task (Optional)
            </label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={!selectedProject}
            >
              <option value="">All Tasks</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Files (Max 10 files, 50MB each)
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Allowed: PDF, DOC, DOCX, XLS, XLSX, TXT, Images, ZIP
          </p>
          {selectedFiles.length > 0 && (
            <div className="mt-2 p-2 bg-blue-50 rounded">
              <p className="text-sm font-medium text-blue-700">
                {selectedFiles.length} file(s) selected:
              </p>
              <ul className="text-sm text-blue-600 mt-1">
                {selectedFiles.map((file, idx) => (
                  <li key={idx}>• {file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : "Upload Files"}
        </button>
      </div>

      {/* Files List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Files</h2>
          <div className="text-sm text-gray-600">
            {selectedProject && `Project: ${projects.find(p => p.id === selectedProject)?.name || selectedProject}`}
            {selectedTask && ` | Task: ${tasks.find(t => t.id === selectedTask)?.title || selectedTask}`}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading files...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No files found</p>
            {selectedProject || selectedTask ? (
              <p className="text-sm text-gray-500 mt-2">
                Try selecting a different project or task, or upload new files
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFiles).map(([projectId, taskGroups]) => {
              const project = projects.find(p => p.id === projectId);
              return (
                <div key={projectId} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3 flex items-center">
                    <span className="mr-2">📁</span>
                    {project?.name || projectId || "General"}
                  </h3>
                  
                  {Object.entries(taskGroups).map(([taskId, taskFiles]) => {
                    const taskObj = tasks.find(t => t.id === taskId);
                    return (
                      <div key={taskId} className="ml-4 mb-4 last:mb-0">
                        <h4 className="font-medium text-md mb-2 flex items-center">
                          <span className="mr-2">📄</span>
                          {taskObj?.title || taskId || "General"}
                        </h4>
                        
                        <div className="ml-4 space-y-2">
                          {taskFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100"
                            >
                              <div className="flex items-center flex-1">
                                <span className="mr-3">
                                  {file.format === "pdf" && "📕"}
                                  {file.format === "doc" && "📘"}
                                  {file.format === "docx" && "📘"}
                                  {file.format === "xls" && "📊"}
                                  {file.format === "xlsx" && "📊"}
                                  {["jpg", "jpeg", "png", "gif"].includes(file.format) && "🖼️"}
                                  {file.format === "zip" && "📦"}
                                  {!["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "gif", "zip"].includes(file.format) && "📄"}
                                </span>
                                <div className="flex-1">
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline font-medium"
                                  >
                                    {file.name}
                                  </a>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDelete(file)}
                                className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

