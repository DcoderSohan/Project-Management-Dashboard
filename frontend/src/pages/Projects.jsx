import React, { useState, useEffect } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ProjectForm from "../components/ProjectForm";
import ShareProjectModal from "../components/ShareProjectModal";
import { fetchProjects, createProject, updateProject, deleteProject } from "../services/projectService";
import { getUserSharedProjects, getProjectByToken } from "../services/accessService";
import { FaPlus, FaEdit, FaTrash, FaFolder, FaUser, FaCheckCircle, FaClock, FaExclamationTriangle, FaShare, FaUsers } from "react-icons/fa";

export default function Projects() {
  const [searchParams] = useSearchParams();
  const { token } = useParams();
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sharingProject, setSharingProject] = useState(null);
  const [isSharedView, setIsSharedView] = useState(false);
  const [sharedEmail, setSharedEmail] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading projects:", error);
      setProjects([]);
      const errorMessage = error.response?.data?.error || error.message || "Failed to load projects";
      alert(`Failed to load projects: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const loadSharedProjects = async (email) => {
    try {
      setLoading(true);
      const data = await getUserSharedProjects(email);
      setProjects(Array.isArray(data) ? data : []);
      setIsSharedView(true);
      setSharedEmail(email);
    } catch (error) {
      console.error("Error loading shared projects:", error);
      setProjects([]);
      const errorMessage = error.response?.data?.error || error.message || "Failed to load shared projects";
      alert(`Failed to load shared projects: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectByToken = async (shareToken) => {
    try {
      setLoading(true);
      const projectData = await getProjectByToken(shareToken);
      // getProjectByToken returns a single project object, so we wrap it in an array
      if (projectData && projectData.id) {
        setProjects([projectData]);
        setIsSharedView(true);
        // For token-based shares, sharedWith is empty, so we use a generic label
        setSharedEmail("Link Share");
      } else {
        setProjects([]);
        alert("Invalid or expired share link.");
      }
    } catch (error) {
      console.error("Error loading project by token:", error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to load project";
      alert(`Failed to load project: ${errorMessage}. The link may be invalid or expired.`);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Handle token-based sharing (e.g., /projects/shared/:token)
    if (token) {
      loadProjectByToken(token);
      return;
    }

    // Handle email-based sharing (e.g., /projects?shared=true&email=...)
    const shared = searchParams.get("shared");
    const email = searchParams.get("email");
    
    if (shared === "true" && email) {
      loadSharedProjects(email);
    } else {
      load();
      setIsSharedView(false);
      setSharedEmail("");
    }
  }, [searchParams, token]);

  const onSave = async (form) => {
    try {
      if (editing?.id) {
        await updateProject(editing.id, form);
      } else {
        await createProject(form);
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    if (!id) {
      alert("Error: No project ID provided");
      return;
    }

    if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      try {
        const response = await deleteProject(id);
        console.log("Delete response:", response);
        await load();
        alert("Project deleted successfully!");
      } catch (error) {
        console.error("Error deleting project:", error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to delete project";
        alert(`Failed to delete project: ${errorMessage}`);
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Completed":
        return <FaCheckCircle className="text-green-600" />;
      case "In Progress":
        return <FaClock className="text-blue-600" />;
      case "Blocked":
        return <FaExclamationTriangle className="text-red-600" />;
      default:
        return <FaClock className="text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      "Completed": "bg-green-100 text-green-800 border-green-200",
      "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
      "Blocked": "bg-red-100 text-red-800 border-red-200",
      "Not Started": "bg-gray-100 text-gray-800 border-gray-200",
    };
    return styles[status] || styles["Not Started"];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar title="Projects Management" />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                {isSharedView ? (
                  <>
                    <FaUsers className="text-green-600" />
                    Shared Projects
                  </>
                ) : (
                  <>
                    <FaFolder className="text-blue-600" />
                    Projects
                  </>
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                {isSharedView 
                  ? `Projects shared with ${sharedEmail}` 
                  : "Manage all your projects"}
              </p>
              {isSharedView && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> These are projects that have been shared with you. 
                    {projects.some(p => p.permission === "viewer") && " Some projects are view-only."}
                    {projects.some(p => p.permission === "editor") && " Some projects allow editing."}
                  </p>
                </div>
              )}
            </div>
            {!isSharedView && (
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-2 font-semibold"
              >
                <FaPlus /> New Project
              </button>
            )}
          </div>
        </div>

        {/* Project Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editing ? "Edit Project" : "New Project"}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-3xl font-light leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <ProjectForm
                  initial={editing || {}}
                  onSave={onSave}
                  onCancel={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Share Project Modal */}
        {sharingProject && (
          <ShareProjectModal
            project={sharingProject}
            onClose={() => setSharingProject(null)}
            currentUserEmail={sharingProject.owner || localStorage.getItem("userEmail") || ""}
            currentUserName={localStorage.getItem("userName") || ""}
          />
        )}

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FaFolder className="text-gray-400 text-6xl mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No projects found</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first project</p>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <div
                key={project.id || `project-${index}`}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{project.name}</h3>
                      {project.description && (
                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">{project.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    {isSharedView && project.permission && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          project.permission === "editor" 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {project.permission === "editor" ? "Editor" : "Viewer"}
                        </span>
                        {project.sharedByName && (
                          <span className="text-gray-600 text-xs">
                            Shared by {project.sharedByName}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FaUser className="text-blue-500" />
                      <span className="font-medium">Owner:</span>
                      <span>{project.owner || "Unassigned"}</span>
                    </div>

                    {project.startDate && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Start:</span> {project.startDate}
                      </div>
                    )}
                    {project.endDate && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">End:</span> {project.endDate}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-2 ${getStatusBadge(project.status)}`}>
                      {getStatusIcon(project.status)}
                      {project.status || "Not Started"}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-4 border-t flex-wrap">
                    {!isSharedView && (
                      <>
                        <button
                          onClick={() => setSharingProject(project)}
                          className="flex-1 bg-green-50 text-green-600 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2 font-medium"
                          title="Share project"
                        >
                          <FaShare /> Share
                        </button>
                        <button
                          onClick={() => { setEditing(project); setShowForm(true); }}
                          className="flex-1 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                          <FaTrash /> Delete
                        </button>
                      </>
                    )}
                    {isSharedView && project.permission === "editor" && (
                      <button
                        onClick={() => { setEditing(project); setShowForm(true); }}
                        className="flex-1 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 font-medium"
                      >
                        <FaEdit /> Edit
                      </button>
                    )}
                    {isSharedView && project.permission === "viewer" && (
                      <div className="flex-1 text-center text-sm text-gray-500 py-2">
                        View only
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
