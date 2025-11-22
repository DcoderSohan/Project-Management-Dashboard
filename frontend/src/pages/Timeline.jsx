import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import GanttChart from "../components/GanttChart";
import { fetchProjects } from "../services/projectService";
import { fetchTasks } from "../services/taskService";
import { FaCalendarAlt, FaFilter, FaExclamationTriangle } from "react-icons/fa";
import { getOverlapWarnings } from "../utils/taskOverlap";

export default function Timeline() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showOverlapsOnly, setShowOverlapsOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, tasksData] = await Promise.all([
        fetchProjects(),
        fetchTasks(),
      ]);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error) {
      console.error("Error loading data:", error);
      setProjects([]);
      setTasks([]);
      const errorMessage = error.response?.data?.error || error.message || "Failed to load timeline data";
      alert(`Failed to load timeline data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Get overlap warnings
  const overlapWarnings = getOverlapWarnings(tasks);
  const hasOverlaps = Object.keys(overlapWarnings).length > 0;

  // Filter tasks based on selected project and overlap filter
  const filteredTasks = tasks.filter((task) => {
    if (selectedProjectId && task.projectId !== selectedProjectId) {
      return false;
    }
    if (showOverlapsOnly && !overlapWarnings[task.id]) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar title="Project Timeline" />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FaCalendarAlt className="text-blue-600" />
                Timeline View
              </h1>
              <p className="text-gray-600 mt-1">
                Visualize all projects and tasks on a timeline with overlap detection
              </p>
            </div>
            <button
              onClick={loadData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FaFilter /> Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col md:flex-row flex-wrap gap-3 md:gap-4 items-start md:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Filter by Project:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOverlapsOnly}
                onChange={(e) => setShowOverlapsOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show overlapping tasks only</span>
            </label>

            {hasOverlaps && (
              <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
                <FaExclamationTriangle />
                <span className="text-sm font-medium">
                  {Object.keys(overlapWarnings).length} task(s) have overlaps
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Overlap Details */}
        {hasOverlaps && !showOverlapsOnly && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
              <FaExclamationTriangle />
              Overlap Warnings
            </h3>
            <div className="space-y-2">
              {Object.entries(overlapWarnings).map(([taskId, overlappingIds]) => {
                const task = tasks.find((t) => t.id === taskId);
                if (!task) return null;
                return (
                  <div key={taskId} className="text-sm text-yellow-700">
                    <span className="font-medium">"{task.title}"</span> overlaps with:{" "}
                    {overlappingIds.map((id, index) => {
                      const overlappingTask = tasks.find((t) => t.id === id);
                      return (
                        <span key={id}>
                          {index > 0 && ", "}
                          <span className="font-medium">"{overlappingTask?.title || id}"</span>
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gantt Chart */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading timeline...</p>
          </div>
        ) : (
          <GanttChart
            projects={projects}
            tasks={filteredTasks}
            selectedProjectId={selectedProjectId || null}
          />
        )}

        {/* Stats Section */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600">Total Projects</div>
            <div className="text-2xl font-bold text-gray-800">{projects.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600">Total Tasks</div>
            <div className="text-2xl font-bold text-gray-800">{tasks.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600">Tasks with Dates</div>
            <div className="text-2xl font-bold text-gray-800">
              {tasks.filter((t) => t.startDate && t.endDate).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

