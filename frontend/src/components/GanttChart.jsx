import React, { useMemo } from "react";
import { getOverlapWarnings } from "../utils/taskOverlap";

/**
 * GanttChart Component
 * Displays tasks in a Gantt chart format with timeline visualization
 */
export default function GanttChart({ projects = [], tasks = [], selectedProjectId = null }) {
  // Filter tasks by selected project if provided
  const filteredTasks = useMemo(() => {
    if (!selectedProjectId) return tasks;
    return tasks.filter((task) => task.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  // Get overlap warnings
  const overlapWarnings = useMemo(() => {
    return getOverlapWarnings(filteredTasks);
  }, [filteredTasks]);

  // Calculate date range for the chart
  const dateRange = useMemo(() => {
    const allDates = [];
    
    // Add project dates
    projects.forEach((project) => {
      if (project.startDate) allDates.push(new Date(project.startDate));
      if (project.endDate) allDates.push(new Date(project.endDate));
    });
    
    // Add task dates
    filteredTasks.forEach((task) => {
      if (task.startDate) allDates.push(new Date(task.startDate));
      if (task.endDate) allDates.push(new Date(task.endDate));
    });

    if (allDates.length === 0) {
      const today = new Date();
      const start = new Date(today);
      start.setMonth(start.getMonth() - 1);
      const end = new Date(today);
      end.setMonth(end.getMonth() + 3);
      return { start, end };
    }

    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    
    // Add padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);
    
    return { start: minDate, end: maxDate };
  }, [projects, filteredTasks]);

  // Calculate number of days in range
  const daysInRange = useMemo(() => {
    const diffTime = Math.abs(dateRange.end - dateRange.start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [dateRange]);

  // Get project name helper
  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : projectId || "Unknown";
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-500";
      case "In Progress":
        return "bg-blue-500";
      case "Blocked":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  // Calculate position and width for a task bar
  const getTaskBarStyle = (task) => {
    if (!task.startDate || !task.endDate) {
      return { display: "none" };
    }

    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);
    
    const startOffset = Math.max(0, (startDate - dateRange.start) / (1000 * 60 * 60 * 24));
    const endOffset = (endDate - dateRange.start) / (1000 * 60 * 60 * 24);
    const width = Math.max(1, endOffset - startOffset);

    const leftPercent = (startOffset / daysInRange) * 100;
    const widthPercent = (width / daysInRange) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  // Generate date labels for the timeline
  const dateLabels = useMemo(() => {
    const labels = [];
    const currentDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    // Show labels for each week
    while (currentDate <= endDate) {
      labels.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return labels;
  }, [dateRange]);

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const grouped = {};
    filteredTasks.forEach((task) => {
      if (!grouped[task.projectId]) {
        grouped[task.projectId] = [];
      }
      grouped[task.projectId].push(task);
    });
    return grouped;
  }, [filteredTasks]);

  // Get all project IDs that have tasks
  const projectIdsWithTasks = Object.keys(tasksByProject);

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-full bg-white rounded-lg shadow-md p-2 md:p-4">
        {/* Timeline Header */}
        <div className="mb-4 border-b pb-2">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-2 gap-2">
            <h3 className="text-lg font-semibold text-gray-800">
              {selectedProjectId ? `Timeline: ${getProjectName(selectedProjectId)}` : "Timeline View - All Projects"}
            </h3>
            <div className="text-sm text-gray-600">
              {filteredTasks.length} task(s) | {projectIdsWithTasks.length} project(s)
            </div>
          </div>
          
          {/* Date scale */}
          <div className="relative h-8 border-t border-gray-300 mt-4">
            {dateLabels.map((date, index) => {
              const position = ((date - dateRange.start) / (dateRange.end - dateRange.start)) * 100;
              return (
                <div
                  key={index}
                  className="absolute top-0 transform -translate-x-1/2"
                  style={{ left: `${position}%` }}
                >
                  <div className="w-px h-full bg-gray-300"></div>
                  <div className="text-xs text-gray-600 mt-1 whitespace-nowrap">
                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gantt Chart Content */}
        <div className="space-y-4">
          {projectIdsWithTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tasks with dates found. Add start and end dates to tasks to see them on the timeline.
            </div>
          ) : (
            projectIdsWithTasks.map((projectId) => {
              const projectTasks = tasksByProject[projectId];
              const project = projects.find((p) => p.id === projectId);
              
              return (
                <div key={projectId} className="border-b border-gray-200 pb-4 last:border-b-0">
                  {/* Project Header */}
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="font-semibold text-gray-700">{getProjectName(projectId)}</h4>
                    {project && project.startDate && project.endDate && (
                      <span className="text-xs text-gray-500">
                        ({project.startDate} - {project.endDate})
                      </span>
                    )}
                  </div>

                  {/* Tasks for this project */}
                  <div className="space-y-2">
                    {projectTasks
                      .filter((task) => task.startDate && task.endDate)
                      .map((task) => {
                        const hasOverlap = overlapWarnings[task.id]?.length > 0;
                        const barStyle = getTaskBarStyle(task);
                        
                        return (
                          <div
                            key={task.id}
                            className="relative h-10 md:h-12 flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-0"
                          >
                            {/* Task label */}
                            <div className="w-full md:w-48 flex-shrink-0 pr-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-700 truncate" title={task.title}>
                                  {task.title}
                                </span>
                                {hasOverlap && (
                                  <span
                                    className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded whitespace-nowrap"
                                    title={`Overlaps with ${overlapWarnings[task.id].length} other task(s)`}
                                  >
                                    ⚠ Overlap
                                  </span>
                                )}
                              </div>
                              {/* Task dates - show on mobile */}
                              <div className="md:hidden text-xs text-gray-600 mt-1">
                                {task.startDate} - {task.endDate}
                              </div>
                            </div>

                            {/* Task bar container */}
                            <div className="flex-1 relative h-6 bg-gray-100 rounded w-full md:w-auto">
                              {/* Task bar */}
                              <div
                                className={`absolute top-0 h-full rounded ${getStatusColor(task.status)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                                style={barStyle}
                                title={`${task.title} (${task.startDate} - ${task.endDate})`}
                              >
                                <div className="h-full flex items-center justify-center text-white text-xs px-1 truncate hidden md:flex">
                                  {task.title}
                                </div>
                              </div>
                            </div>

                            {/* Task dates - show on desktop */}
                            <div className="hidden md:block w-48 flex-shrink-0 pl-2 text-xs text-gray-600">
                              {task.startDate} - {task.endDate}
                            </div>
                          </div>
                        );
                      })}
                    
                    {projectTasks.filter((task) => task.startDate && task.endDate).length === 0 && (
                      <div className="text-sm text-gray-500 italic pl-0 md:pl-48">
                        No tasks with dates for this project
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span>Not Started</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">⚠ Overlap</span>
            <span>Overlapping tasks</span>
          </div>
        </div>
      </div>
    </div>
  );
}

