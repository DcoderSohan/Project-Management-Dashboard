import React, { useMemo, useEffect, useRef } from "react";
import { gantt } from "dhtmlx-gantt";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import { getOverlapWarnings } from "../utils/taskOverlap";

/**
 * GanttChart Component
 * Displays tasks in a Gantt chart format using dhtmlx-gantt library
 */
export default function GanttChart({ projects = [], tasks = [], selectedProjectId = null }) {
  const ganttContainer = useRef(null);

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

  // Get status color
  const getStatusColor = (status, hasOverlap) => {
    if (hasOverlap) {
      return "#eab308"; // Yellow for overlapping
    }
    
    switch (status) {
      case "Completed":
        return "#16a34a"; // Green
      case "In Progress":
        return "#2563eb"; // Blue
      case "Blocked":
        return "#dc2626"; // Red
      default:
        return "#9ca3af"; // Gray
    }
  };

  // Transform tasks to dhtmlx-gantt format
  const ganttData = useMemo(() => {
    const tasksWithDates = filteredTasks.filter((task) => task.startDate && task.endDate);
    
    if (tasksWithDates.length === 0) {
      return { data: [], links: [] };
    }

    const data = tasksWithDates.map((task, index) => {
      const hasOverlap = overlapWarnings[task.id]?.length > 0;
      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);
      
      // Calculate progress based on status
      let progress = 0;
      if (task.status === "Completed") {
        progress = 100;
      } else if (task.status === "In Progress") {
        progress = task.progress || 50;
      } else if (task.status === "Blocked") {
        progress = task.progress || 25;
      }

      // Create task text with project name
      const projectName = getProjectName(task.projectId);
      const taskText = selectedProjectId 
        ? task.title 
        : `${projectName} - ${task.title}`;

      return {
        id: task.id || `task-${index}`,
        text: taskText,
        start_date: startDate,
        end_date: endDate,
        progress: progress / 100,
        color: getStatusColor(task.status, hasOverlap),
        open: true,
        type: "task",
        // Store original task data
        originalTask: task,
        hasOverlap: hasOverlap,
      };
    });

    return { data, links: [] };
  }, [filteredTasks, overlapWarnings, selectedProjectId, projects]);

  // Initialize Gantt chart
  useEffect(() => {
    if (!ganttContainer.current) return;

    // Configure Gantt
    gantt.config.date_format = "%Y-%m-%d";
    
    // Configure columns
    gantt.config.columns = [
      { name: "text", label: "Task Name", width: "*", tree: true },
      { name: "start_date", label: "Start Date", width: 120, align: "center", template: (task) => {
        return gantt.templates.format_date(task.start_date, "date");
      }},
      { name: "end_date", label: "End Date", width: 120, align: "center", template: (task) => {
        return gantt.templates.format_date(task.end_date, "date");
      }},
      { name: "progress", label: "Progress", width: 80, align: "center", template: (task) => `${Math.round(task.progress * 100)}%` },
    ];

    // Configure scales
    gantt.config.scale_unit = "day";
    gantt.config.date_scale = "%M %d";
    gantt.config.subscales = [
      { unit: "week", step: 1, date: "%W" }
    ];
    
    // Configure date templates
    gantt.templates.date_format = (date) => {
      return gantt.templates.format_date(date, "%Y-%m-%d");
    };

    // Configure task height
    gantt.config.row_height = 40;
    gantt.config.bar_height = 25;

    // Initialize Gantt
    gantt.init(ganttContainer.current);

    // Load data
    gantt.clearAll();
    gantt.parse(ganttData);

    // Cleanup on unmount
    return () => {
      if (ganttContainer.current) {
        gantt.clearAll();
      }
    };
  }, [ganttData]);

  // Filter tasks with dates
  const tasksWithDates = filteredTasks.filter((task) => task.startDate && task.endDate);

  if (tasksWithDates.length === 0) {
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
              {tasksWithDates.length} task(s) | {new Set(filteredTasks.map(t => t.projectId)).size} project(s)
            </div>
          </div>
        </div>

        {/* Gantt Chart Container */}
        <div 
          ref={ganttContainer} 
          className="gantt-container"
          style={{ 
            width: "100%", 
            height: "600px",
            minHeight: "400px"
          }}
        />

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-xs md:text-sm">
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

      {/* Custom CSS for Gantt chart styling */}
      <style>{`
        .gantt-container {
          font-family: inherit;
        }
        
        /* Override Gantt chart colors to match our theme */
        .gantt_task_line {
          border-radius: 4px;
        }
        
        .gantt_task_progress {
          border-radius: 4px;
        }
        
        /* Ensure proper scrolling */
        .gantt_layout_content {
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
