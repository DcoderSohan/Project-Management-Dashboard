import React, { useMemo } from "react";
import { Gantt, Willow } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { getOverlapWarnings } from "../utils/taskOverlap";

/**
 * GanttChart Component
 * Displays tasks in a Gantt chart format using SVAR React Gantt library
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

  // Get project name helper
  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : projectId || "Unknown";
  };

  // Get status color class for CSS styling
  const getStatusColorClass = (status, hasOverlap) => {
    if (hasOverlap) {
      return "task-overlap"; // Special color for overlapping tasks
    }
    
    switch (status) {
      case "Completed":
        return "task-completed";
      case "In Progress":
        return "task-in-progress";
      case "Blocked":
        return "task-blocked";
      default:
        return "task-not-started";
    }
  };

  // Transform tasks to SVAR Gantt format
  const svarTasks = useMemo(() => {
    return filteredTasks
      .filter((task) => task.startDate && task.endDate)
      .map((task) => {
        const hasOverlap = overlapWarnings[task.id]?.length > 0;
        const startDate = new Date(task.startDate);
        const endDate = new Date(task.endDate);
        
        // Calculate progress based on status (or use task.progress if available)
        let progress = 0;
        if (task.status === "Completed") {
          progress = 100;
        } else if (task.status === "In Progress") {
          progress = task.progress || 50; // Default to 50% if not specified
        } else if (task.status === "Blocked") {
          progress = task.progress || 25; // Show some progress even if blocked
        }

        // Create task text with project name
        const projectName = getProjectName(task.projectId);
        const taskText = selectedProjectId 
          ? task.title 
          : `${projectName} - ${task.title}`;

        return {
          id: task.id,
          text: taskText,
          start: startDate,
          end: endDate,
          progress: progress,
          type: "task",
          css: getStatusColorClass(task.status, hasOverlap),
          // Store original task data for tooltips
          originalTask: task,
          hasOverlap: hasOverlap,
        };
      });
  }, [filteredTasks, overlapWarnings, selectedProjectId, projects]);

  // If no tasks, show message
  if (svarTasks.length === 0) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center py-8 text-gray-500">
          No tasks with dates found. Add start and end dates to tasks to see them on the timeline.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-full bg-white rounded-lg shadow-md p-4">
        {/* Header */}
        <div className="mb-4 border-b pb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-2 gap-2">
            <h3 className="text-lg font-semibold text-gray-800">
              {selectedProjectId 
                ? `Timeline: ${getProjectName(selectedProjectId)}` 
                : "Timeline View - All Projects"}
            </h3>
            <div className="text-sm text-gray-600">
              {svarTasks.length} task(s) | {new Set(filteredTasks.map(t => t.projectId)).size} project(s)
            </div>
          </div>
        </div>

        {/* SVAR Gantt Chart */}
        <div className="gantt-container">
          <Willow>
            <Gantt tasks={svarTasks} />
          </Willow>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span>Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span>Not Started</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Overlapping tasks</span>
          </div>
        </div>
      </div>

      {/* Custom CSS for task bar colors */}
      <style>{`
        /* Completed tasks - Green */
        .task-completed .gantt_task_progress,
        .task-completed .svar-gantt-task-bar-progress {
          background-color: #16a34a !important;
          background: linear-gradient(90deg, #16a34a 0%, #22c55e 100%) !important;
          fill: #16a34a !important;
        }
        .task-completed .gantt_task_bar,
        .task-completed .svar-gantt-task-bar {
          fill: #16a34a !important;
          stroke: #15803d !important;
        }

        /* In Progress tasks - Blue */
        .task-in-progress .gantt_task_progress,
        .task-in-progress .svar-gantt-task-bar-progress {
          background-color: #2563eb !important;
          background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%) !important;
          fill: #2563eb !important;
        }
        .task-in-progress .gantt_task_bar,
        .task-in-progress .svar-gantt-task-bar {
          fill: #2563eb !important;
          stroke: #1d4ed8 !important;
        }

        /* Blocked tasks - Red */
        .task-blocked .gantt_task_progress,
        .task-blocked .svar-gantt-task-bar-progress {
          background-color: #dc2626 !important;
          background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%) !important;
          fill: #dc2626 !important;
        }
        .task-blocked .gantt_task_bar,
        .task-blocked .svar-gantt-task-bar {
          fill: #dc2626 !important;
          stroke: #b91c1c !important;
        }

        /* Not Started tasks - Gray */
        .task-not-started .gantt_task_progress,
        .task-not-started .svar-gantt-task-bar-progress {
          background-color: #9ca3af !important;
          background: linear-gradient(90deg, #9ca3af 0%, #d1d5db 100%) !important;
          fill: #9ca3af !important;
        }
        .task-not-started .gantt_task_bar,
        .task-not-started .svar-gantt-task-bar {
          fill: #9ca3af !important;
          stroke: #6b7280 !important;
        }

        /* Overlapping tasks - Yellow/Orange */
        .task-overlap .gantt_task_progress,
        .task-overlap .svar-gantt-task-bar-progress {
          background-color: #eab308 !important;
          background: linear-gradient(90deg, #eab308 0%, #f59e0b 100%) !important;
          fill: #eab308 !important;
        }
        .task-overlap .gantt_task_bar,
        .task-overlap .svar-gantt-task-bar {
          fill: #eab308 !important;
          stroke: #f59e0b !important;
          stroke-width: 2px !important;
          filter: drop-shadow(0 0 4px rgba(234, 179, 8, 0.5)) !important;
        }

        /* Task bar hover effects */
        .gantt_task_line:hover .gantt_task_progress,
        .gantt_task_line:hover .svar-gantt-task-bar-progress {
          opacity: 0.9 !important;
          transform: scaleY(1.05) !important;
          transition: all 0.2s ease !important;
        }

        /* Ensure proper spacing */
        .gantt-container {
          min-height: 400px;
        }
      `}</style>
    </div>
  );
}
