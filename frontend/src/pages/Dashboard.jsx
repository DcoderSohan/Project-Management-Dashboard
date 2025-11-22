import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import GuidelinesCard from "../components/GuidelinesCard";
import ChartCard from "../components/ChartCard";
import ProjectForm from "../components/ProjectForm";
import TaskForm from "../components/TaskForm";
import UserForm from "../components/UserForm";
import { getDashboardData } from "../services/dashboardService";
import { fetchProjects, createProject, updateProject } from "../services/projectService";
import { fetchTasks, createTask, updateTask } from "../services/taskService";
import { fetchUsers, createUser, updateUser } from "../services/userService";
import { FaArrowsRotate } from "react-icons/fa6";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const COLORS = {
  "pending": "#f97316",
  "Pending": "#f97316", // Backward compatibility
  "Not Started": "#f97316", // Backward compatibility
  "inProgress": "#3b82f6",
  "In Progress": "#3b82f6", // Backward compatibility
  "completed": "#10b981",
  "Completed": "#10b981", // Backward compatibility
  overdue: "#ef4444",
};

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  
  // Data for forms
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardData();
      console.log("📊 Dashboard data received:", data);
      console.log("📊 Status counts:", data?.statusCounts);
      console.log("📊 Project completion:", data?.projectCompletion);
      console.log("📊 Employee workload:", data?.employeeWorkload);
      setDashboard(data);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    loadProjects();
    loadUsers();
  }, []);

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

  const handleProjectSave = async (form) => {
    try {
      if (editingProject?.id) {
        await updateProject(editingProject.id, form);
      } else {
        await createProject(form);
      }
      setShowProjectModal(false);
      setEditingProject(null);
      await loadProjects();
      await fetchData(); // Refresh dashboard
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project. Please try again.");
    }
  };

  const handleTaskSave = async (form) => {
    try {
      if (editingTask?.id) {
        await updateTask(editingTask.id, form);
      } else {
        await createTask(form);
      }
      setShowTaskModal(false);
      setEditingTask(null);
      await fetchData(); // Refresh dashboard
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task. Please try again.");
    }
  };

  const handleUserSave = async (form) => {
    try {
      if (editingUser?.id) {
        await updateUser(editingUser.id, form);
      } else {
        await createUser(form);
      }
      setShowUserModal(false);
      setEditingUser(null);
      await loadUsers();
      await fetchData(); // Refresh dashboard
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Failed to save user. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
            <p className="text-xl text-red-600 mb-4">
              {error || "Failed to load dashboard data"}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Please check your connection and try again.
            </p>
            <button
              onClick={fetchData}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaArrowsRotate className="inline mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for charts - ensure we have valid data with null checks
  const statusCounts = dashboard?.statusCounts || {};
  console.log("📊 Processing statusCounts:", statusCounts);
  
  // Map status names to requested format: pending, inProgress, completed
  const statusNameMap = {
    "Not Started": "pending",
    "In Progress": "inProgress",
    "Completed": "completed"
  };
  
  // Ensure we always show the three main statuses even if count is 0
  const statusChartData = [
    { name: "pending", value: statusCounts["Not Started"] || 0 },
    { name: "inProgress", value: statusCounts["In Progress"] || 0 },
    { name: "completed", value: statusCounts["Completed"] || 0 },
    // Include any other statuses that might exist
    ...Object.entries(statusCounts)
      .filter(([name, value]) => 
        name !== "Not Started" && 
        name !== "In Progress" && 
        name !== "Completed" && 
        value != null && value > 0
      )
      .map(([name, value]) => ({ 
        name: statusNameMap[name] || name, 
        value: value || 0 
      }))
  ].filter(item => item.value > 0); // Only show statuses with tasks
  
  console.log("📊 Status chart data:", statusChartData);

  const projectChartData = (dashboard?.projectCompletion || [])
    .filter(project => project != null && project.project != null)
    .map((project) => {
      // Calculate progress if not provided
      const progress = project.progress != null && project.progress !== undefined
        ? project.progress 
        : (project.totalTasks > 0 
          ? Math.round(((project.completedTasks || 0) / project.totalTasks) * 100) 
          : 0);
      return {
        name: project.project && project.project.length > 15 
          ? project.project.substring(0, 15) + "..." 
          : project.project || "Unknown",
        progress: Math.max(0, Math.min(100, progress)), // Ensure progress is between 0-100
        fullName: project.project || "Unknown",
        completedTasks: project.completedTasks || 0,
        totalTasks: project.totalTasks || 0,
      };
    })
    .filter(project => project.totalTasks > 0) // Only show projects with tasks
    .sort((a, b) => b.progress - a.progress) // Sort by progress descending
    .slice(0, 10); // Show top 10 projects
  
  console.log("📊 Project chart data:", projectChartData);

  const employeeWorkloadData = Object.entries(dashboard?.employeeWorkload || {})
    .filter(([name, value]) => name != null && value != null && value > 0)
    .map(([name, value]) => ({
      name: (name || "Unknown").length > 12 
        ? (name || "Unknown").substring(0, 12) + "..." 
        : (name || "Unknown"),
      tasks: value || 0,
      fullName: name || "Unknown",
    }))
    .sort((a, b) => (b.tasks || 0) - (a.tasks || 0))
    .slice(0, 10) // Show top 10 employees after sorting
    .filter(item => item.tasks > 0); // Only show employees with tasks
  
  console.log("📊 Employee workload data:", employeeWorkloadData);

  const completedTasks = dashboard?.statusCounts?.["Completed"] || dashboard?.statusCounts?.Completed || 0;
  const totalTasks = dashboard?.totalTasks || 0;
  const completionRate = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;
  
  console.log("📊 Completion rate:", completionRate, "(", completedTasks, "/", totalTasks, ")");

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <Navbar title="Project Portfolio Dashboard" />

      {/* Top banner */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-8 text-center relative">
        <button
          onClick={fetchData}
          disabled={loading}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh data"
        >
          <FaArrowsRotate className={loading ? "animate-spin" : ""} />
        </button>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-wide px-4">
          Project Portfolio Management
        </h1>
        <p className="mt-2 text-blue-100 text-sm sm:text-base px-4">Real-time project and task analytics</p>
      </header>

      {/* Guidelines + Quick Actions Section */}
      <section className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <GuidelinesCard />
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="font-semibold mb-3 border-b pb-2">Quick Actions</h3>
          <div className="space-y-2 mb-4">
            <button
              onClick={() => {
                setEditingProject(null);
                setShowProjectModal(true);
              }}
              className="w-full text-left px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              ➕ New Project
            </button>
            <button
              onClick={() => {
                setEditingTask(null);
                setShowTaskModal(true);
              }}
              className="w-full text-left px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              ➕ New Task
            </button>
            <button
              onClick={() => {
                setEditingUser(null);
                setShowUserModal(true);
              }}
              className="w-full text-left px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              ➕ New User
            </button>
          </div>
          <div className="border-t pt-3">
            <h4 className="font-semibold mb-2 text-sm text-gray-600">Manage</h4>
            <div className="grid grid-cols-3 gap-2">
              <Link
                to="/projects"
                className="text-center px-2 sm:px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs sm:text-sm"
              >
                📁 Projects
              </Link>
              <Link
                to="/tasks"
                className="text-center px-2 sm:px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs sm:text-sm"
              >
                ✅ Tasks
              </Link>
              <Link
                to="/users"
                className="text-center px-2 sm:px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs sm:text-sm"
              >
                👥 Users
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <ChartCard title="Total Tasks" value={dashboard.totalTasks || 0} />
        <ChartCard title="Total Projects" value={dashboard.totalProjects || 0} />
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <h3 className="font-semibold mb-2 border-b pb-1">Completion Rate</h3>
          <p className="text-3xl font-bold text-green-600">{completionRate}%</p>
          <p className="text-sm text-gray-500 mt-1">
            {completedTasks} of {totalTasks} tasks
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <h3 className="font-semibold mb-2 border-b pb-1">Overdue Tasks</h3>
          <p className="text-3xl font-bold text-red-600">
            {dashboard.overdueTasks?.length || 0}
          </p>
        </div>
      </section>

      {/* Charts Section */}
      <section className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Task Status Distribution */}
        {statusChartData.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold mb-4 border-b pb-2">
              Task Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.name] || "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold mb-4 border-b pb-2">
              Task Status Distribution
            </h3>
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              No task data available
            </div>
          </div>
        )}

        {/* Task Status Bar Chart */}
        {statusChartData.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold mb-4 border-b pb-2">
              Tasks by Status
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.name] || "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold mb-4 border-b pb-2">
              Tasks by Status
            </h3>
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              No task data available
            </div>
          </div>
        )}

        {/* Project Progress */}
        {projectChartData && projectChartData.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold mb-4 border-b pb-2">
              Project Progress (Top 10)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={projectChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip
                  formatter={(value, name, props) => {
                    const entry = props.payload;
                    return [`${value}%`, `Completed: ${entry.completedTasks || 0} / ${entry.totalTasks || 0}`];
                  }}
                  labelFormatter={(label) => `Project: ${label}`}
                />
                <Bar dataKey="progress" fill="#10b981" radius={[0, 8, 8, 0]}>
                  {projectChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.progress === 100
                          ? "#10b981"
                          : entry.progress >= 50
                          ? "#3b82f6"
                          : "#f97316"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold mb-4 border-b pb-2">
              Project Progress (Top 10)
            </h3>
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              No project data available
            </div>
          </div>
        )}

        {/* Employee Workload */}
        {employeeWorkloadData && employeeWorkloadData.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold mb-4 border-b pb-2">
              Employee Workload (Top 10)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={employeeWorkloadData} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{ fontSize: 10 }}
                  interval={0}
                />
                <YAxis />
                <Tooltip
                  formatter={(value, name, props) => {
                    const fullName = props.payload?.fullName || props.payload?.name || "Unknown";
                    return [`${value || 0} tasks`, `Employee: ${fullName}`];
                  }}
                  labelFormatter={(label) => `Tasks: ${label || 0}`}
                />
                <Bar dataKey="tasks" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold mb-4 border-b pb-2">
              Employee Workload (Top 10)
            </h3>
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              No employee data available
            </div>
          </div>
        )}

        {/* Project Completion Details */}
        {dashboard?.projectCompletion && Array.isArray(dashboard.projectCompletion) && dashboard.projectCompletion.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-4 md:col-span-2 lg:col-span-3">
            <h3 className="font-semibold mb-4 border-b pb-2">
              All Projects Completion Status
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-2 sm:p-3 text-left">Project</th>
                    <th className="p-2 sm:p-3 text-left">Total Tasks</th>
                    <th className="p-2 sm:p-3 text-left">Completed</th>
                    <th className="p-2 sm:p-3 text-left">Progress</th>
                    <th className="p-2 sm:p-3 text-left">Status Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.projectCompletion
                    .filter(project => project != null && project.project != null)
                    .map((project, index) => {
                      // Calculate progress if not provided
                      const progress = project.progress != null && project.progress !== undefined
                        ? project.progress
                        : (project.totalTasks > 0 
                          ? Math.round(((project.completedTasks || 0) / project.totalTasks) * 100) 
                          : 0);
                      const totalTasks = project.totalTasks || 0;
                      const completedTasks = project.completedTasks || 0;
                      return (
                        <tr key={`project-${project.project || index}-${index}`} className="border-b hover:bg-gray-50">
                          <td className="p-2 sm:p-3 font-medium">{project.project || "Unknown"}</td>
                          <td className="p-2 sm:p-3">{totalTasks}</td>
                          <td className="p-2 sm:p-3 text-green-600 font-semibold">
                            {completedTasks}
                          </td>
                          <td className="p-2 sm:p-3">
                            <span
                              className={`font-semibold ${
                                progress === 100
                                  ? "text-green-600"
                                  : progress >= 50
                                  ? "text-blue-600"
                                  : "text-orange-600"
                              }`}
                            >
                              {progress}%
                            </span>
                          </td>
                          <td className="p-2 sm:p-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  progress === 100
                                    ? "bg-green-600"
                                    : progress >= 50
                                    ? "bg-blue-600"
                                    : "bg-orange-600"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-4 md:col-span-2 lg:col-span-3">
            <h3 className="font-semibold mb-4 border-b pb-2">
              All Projects Completion Status
            </h3>
            <div className="flex items-center justify-center h-[100px] text-gray-500">
              No project completion data available
            </div>
          </div>
        )}
      </section>

      {/* Overdue Tasks Section */}
      {dashboard?.overdueTasks && Array.isArray(dashboard.overdueTasks) && dashboard.overdueTasks.length > 0 ? (
        <section className="p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold mb-4 border-b pb-2 text-red-600">
              ⚠️ Overdue Tasks ({dashboard.overdueTasks.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-2 sm:p-3 text-left">Task</th>
                    <th className="p-2 sm:p-3 text-left">Project</th>
                    <th className="p-2 sm:p-3 text-left">Assigned To</th>
                    <th className="p-2 sm:p-3 text-left">Due Date</th>
                    <th className="p-2 sm:p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.overdueTasks
                    .filter(task => task != null)
                    .map((task, index) => (
                      <tr key={`overdue-${task.id || task.title || index}-${index}`} className="border-b hover:bg-red-50">
                        <td className="p-2 sm:p-3 font-medium">{task.title || "Unknown"}</td>
                        <td className="p-2 sm:p-3">{task.project || "Unknown"}</td>
                        <td className="p-2 sm:p-3">{task.assignedTo || "Unassigned"}</td>
                        <td className="p-2 sm:p-3 text-red-600 font-semibold">
                          {task.dueDate || "N/A"}
                        </td>
                        <td className="p-2 sm:p-3">
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                            {task.status || "Unknown"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {/* Empty State */}
      {totalTasks === 0 && (
        <section className="p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 text-lg">
              No tasks found. Start by creating a project and adding tasks!
            </p>
          </div>
        </section>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {editingProject ? "Edit Project" : "New Project"}
              </h2>
              <button
                onClick={() => {
                  setShowProjectModal(false);
                  setEditingProject(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <ProjectForm
                initial={editingProject || {}}
                onSave={handleProjectSave}
                onCancel={() => {
                  setShowProjectModal(false);
                  setEditingProject(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {editingTask ? "Edit Task" : "New Task"}
              </h2>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <TaskForm
                initial={editingTask || {}}
                onSave={handleTaskSave}
                onCancel={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                }}
                users={users}
                projects={projects}
              />
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {editingUser ? "Edit User" : "New User"}
              </h2>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <UserForm
                initial={editingUser || {}}
                onSave={handleUserSave}
                onCancel={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
