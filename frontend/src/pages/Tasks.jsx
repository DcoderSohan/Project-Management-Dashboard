import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import TaskForm from "../components/TaskForm";
import { fetchTasks, createTask, updateTask, deleteTask } from "../services/taskService";
import { fetchProjects } from "../services/projectService";
import { fetchUsers } from "../services/userService";
import { FaPlus, FaEdit, FaTrash, FaCheckCircle, FaClock, FaExclamationTriangle, FaFilter } from "react-icons/fa";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = filterProject ? await fetchTasks(filterProject) : await fetchTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading tasks:", error);
      setTasks([]);
      const errorMessage = error.response?.data?.error || error.message || "Failed to load tasks";
      alert(`Failed to load tasks: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await fetchProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading projects:", error);
      setProjects([]);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]);
    }
  };

  useEffect(() => {
    loadTasks();
    loadProjects();
    loadUsers();
  }, [filterProject]);

  const onSave = async (form) => {
    try {
      if (editing?.id) {
        const response = await updateTask(editing.id, form);
        console.log("Task updated:", response);
      } else {
        const response = await createTask(form);
        console.log("Task created:", response);
      }
      setShowForm(false);
      setEditing(null);
      await loadTasks();
    } catch (error) {
      console.error("Error saving task:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to save task";
      alert(`Failed to save task: ${errorMessage}`);
      // Don't close the form on error so user can fix and retry
    }
  };

  const handleDelete = async (id) => {
    if (!id) {
      alert("Error: No task ID provided");
      return;
    }

    if (window.confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      try {
        const response = await deleteTask(id);
        console.log("Delete response:", response);
        await loadTasks();
        // Show success message
        alert("Task deleted successfully!");
      } catch (error) {
        console.error("Error deleting task:", error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to delete task";
        alert(`Failed to delete task: ${errorMessage}`);
      }
    }
  };

  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : projectId || "N/A";
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
      <Navbar title="Tasks Management" />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FaCheckCircle className="text-green-600" />
                Tasks
              </h1>
              <p className="text-gray-600 mt-1">Manage and track all tasks</p>
            </div>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-2 font-semibold"
            >
              <FaPlus /> New Task
            </button>
          </div>

          {/* Filter Section */}
          <div className="mt-4 flex items-center gap-3">
            <FaFilter className="text-gray-500" />
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {filterProject && (
              <button
                onClick={() => setFilterProject("")}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Task Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editing?.id ? "Edit Task" : editing?.parentTaskId ? "New Subtask" : "New Task"}
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
                <TaskForm
                  initial={editing || {}}
                  onSave={onSave}
                  onCancel={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  users={users}
                  projects={projects}
                  tasks={tasks}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tasks List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FaCheckCircle className="text-gray-400 text-6xl mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No tasks found</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first task</p>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Task
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks
              .filter((task) => !task.parentTaskId) // Only show main tasks first
              .map((task, index) => {
                // Get subtasks for this parent task
                const subtasks = tasks.filter((t) => t.parentTaskId === task.id);
                
                return (
                  <div key={task.id || `task-${index}`}>
                    {/* Main Task */}
                    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{task.title}</h3>
                    {task.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Project:</span>
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">{getProjectName(task.projectId)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Assigned To:</span>
                    <span>{task.assignedTo || "Unassigned"}</span>
                  </div>
                  {task.startDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Start Date:</span>
                      <span>{task.startDate}</span>
                    </div>
                  )}
                  {task.endDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">End Date:</span>
                      <span>{task.endDate}</span>
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Due Date:</span>
                      <span>{task.dueDate}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-2 ${getStatusBadge(task.status)}`}>
                    {getStatusIcon(task.status)}
                    {task.status || "Not Started"}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { 
                        // Create a new subtask - set parentTaskId and inherit projectId from parent
                        setEditing({ 
                          parentTaskId: task.id,
                          projectId: task.projectId,
                          status: "Not Started"
                        }); 
                        setShowForm(true); 
                      }}
                      className="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg hover:bg-purple-100 transition-colors text-sm"
                      title="Add Subtask"
                    >
                      <FaPlus className="inline mr-1" /> Subtask
                    </button>
                    <button
                      onClick={() => { setEditing(task); setShowForm(true); }}
                      className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Subtasks */}
              {subtasks.length > 0 && (
                <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-300 pl-4">
                  <div className="text-xs font-semibold text-gray-500 mb-2">
                    Subtasks ({subtasks.length})
                  </div>
                  {subtasks.map((subtask, subIndex) => (
                    <div
                      key={subtask.id || `subtask-${subIndex}`}
                      className="bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <span className="text-purple-600">└─</span>
                            {subtask.title}
                          </h4>
                          {subtask.description && (
                            <p className="text-gray-600 text-xs mt-1 line-clamp-1">{subtask.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${getStatusBadge(subtask.status)}`}>
                          {getStatusIcon(subtask.status)}
                          {subtask.status || "Not Started"}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditing(subtask); setShowForm(true); }}
                            className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-100"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(subtask.id)}
                            className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs hover:bg-red-100"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
                  </div>
                );
              })}
          </div>
        )}

      </div>
    </div>
  );
}
