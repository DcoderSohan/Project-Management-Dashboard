import { readSheetValues } from "../services/googleSheetService.js";

/**
 * 📊 Fetch Dashboard Summary
 * Returns task counts by status, project progress, employee workload, and overdue tasks
 */
export const getDashboardData = async (req, res) => {
  try {
    // Read all tasks
    const { rows: taskRows } = await readSheetValues("Tasks");
    
    // Read all projects to map project IDs to names
    const { rows: projectRows } = await readSheetValues("Projects");
    const projectMap = {};
    (projectRows || []).forEach((row) => {
      const projectId = row[0]; // ID
      const projectName = row[1]; // Name
      projectMap[projectId] = projectName;
    });

    if (!taskRows || taskRows.length === 0) {
      return res.status(200).json({
        statusCounts: { "Not Started": 0, "In Progress": 0, "Completed": 0 },
        projectCompletion: [],
        employeeWorkload: {},
        overdueTasks: [],
        totalTasks: 0,
        totalProjects: projectRows?.length || 0,
      });
    }

    // Initialize counters
    const statusCounts = { "Not Started": 0, "In Progress": 0, "Completed": 0 };
    const projectProgress = {}; // key: projectId, value: { name, total, completed }
    const employeeWorkload = {};
    const overdueTasks = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    // Task columns: ID, ProjectID, Title, Description, AssignedTo, DueDate, Status, Attachments
    taskRows.forEach((row) => {
      const taskId = row[0] || ""; // ID
      const projectId = row[1] || ""; // ProjectID
      const title = row[2] || ""; // Title
      const description = row[3] || ""; // Description
      const assignedTo = row[4] || ""; // AssignedTo
      const dueDate = row[5] || ""; // DueDate
      const status = (row[6] || "Not Started").trim(); // Status

      // Count status (case-insensitive)
      const statusLower = status.toLowerCase();
      if (statusLower === "not started") {
        statusCounts["Not Started"]++;
      } else if (statusLower === "in progress") {
        statusCounts["In Progress"]++;
      } else if (statusLower === "completed") {
        statusCounts["Completed"]++;
      } else {
        // Handle any other status values
        if (!statusCounts[status]) statusCounts[status] = 0;
        statusCounts[status]++;
      }

      // Track project progress by projectId
      if (projectId) {
        if (!projectProgress[projectId]) {
          projectProgress[projectId] = {
            projectId: projectId,
            name: projectMap[projectId] || projectId,
            total: 0,
            completed: 0,
          };
        }
        projectProgress[projectId].total++;
        if (statusLower === "completed") {
          projectProgress[projectId].completed++;
        }
      }

      // Track employee workload
      if (assignedTo) {
        if (!employeeWorkload[assignedTo]) {
          employeeWorkload[assignedTo] = 0;
        }
        employeeWorkload[assignedTo]++;
      }

      // Check for overdue tasks
      if (dueDate && statusLower !== "completed") {
        try {
          const due = new Date(dueDate);
          due.setHours(0, 0, 0, 0);
          if (due < today) {
            overdueTasks.push({
              id: taskId,
              title: title,
              projectId: projectId,
              project: projectMap[projectId] || projectId,
              assignedTo: assignedTo,
              status: status,
              dueDate: dueDate,
            });
          }
        } catch (dateError) {
          // Skip invalid dates
          console.warn(`Invalid due date for task ${taskId}: ${dueDate}`);
        }
      }
    });

    // Calculate % completion per project
    const projectCompletion = Object.values(projectProgress).map((data) => {
      const progress = data.total > 0 
        ? Math.round((data.completed / data.total) * 100) 
        : 0;
      return {
        projectId: data.projectId,
        project: data.name,
        totalTasks: data.total,
        completedTasks: data.completed,
        progress: progress,
      };
    });

    // Sort projects by progress (descending)
    projectCompletion.sort((a, b) => b.progress - a.progress);

    // Sort employee workload by count (descending)
    const sortedEmployeeWorkload = Object.entries(employeeWorkload)
      .sort(([, a], [, b]) => b - a)
      .reduce((acc, [employee, count]) => {
        acc[employee] = count;
        return acc;
      }, {});

    res.status(200).json({
      statusCounts,
      projectCompletion,
      employeeWorkload: sortedEmployeeWorkload,
      overdueTasks,
      totalTasks: taskRows.length,
      totalProjects: projectRows?.length || 0,
    });
  } catch (error) {
    console.error("❌ Dashboard data fetch failed:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to fetch dashboard data",
      message: error.message 
    });
  }
};
