import { readSheetValues } from "../services/googleSheetService.js";

/**
 * 📊 Fetch Dashboard Summary
 * Returns task counts by status, project progress, employee workload, and overdue tasks
 */
export const getDashboardData = async (req, res) => {
  try {
    // Read all tasks
    const { rows: taskRows } = await readSheetValues("Tasks");
    
    // Read all projects to map project IDs to names and status
    // Projects columns: ID, Name, Owner, Description, StartDate, EndDate, Status, Progress
    const { rows: projectRows } = await readSheetValues("Projects");
    const projectMap = {};
    const projectStatusMap = {}; // Track project completion status
    (projectRows || []).forEach((row) => {
      const projectId = row[0]; // ID
      const projectName = row[1]; // Name
      const projectStatus = (row[6] || "").trim().toLowerCase(); // Status (column 6)
      projectMap[projectId] = projectName;
      projectStatusMap[projectId] = projectStatus === "completed";
    });

    // Read all users to map emails to names
    const { rows: userRows } = await readSheetValues("Users");
    const userEmailToNameMap = {};
    (userRows || []).forEach((row) => {
      const userEmail = (row[2] || "").trim(); // Email
      const userName = (row[1] || "").trim(); // Name
      if (userEmail && userName) {
        userEmailToNameMap[userEmail.toLowerCase()] = userName;
      }
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

    // Task columns: ID, ProjectID, Title, Description, AssignedTo, StartDate, EndDate, DueDate, Status, Attachments, ParentTaskID
    taskRows.forEach((row) => {
      const taskId = row[0] || ""; // ID
      const projectId = row[1] || ""; // ProjectID
      const title = row[2] || ""; // Title
      const description = row[3] || ""; // Description
      const assignedTo = row[4] || ""; // AssignedTo
      const startDate = row[5] || ""; // StartDate
      const endDate = row[6] || ""; // EndDate
      const dueDate = row[7] || ""; // DueDate (column 7, not 5)
      const status = (row[8] || "Not Started").trim(); // Status (column 8, not 6)
      const parentTaskId = row[10] || ""; // ParentTaskID (column 10)
      
      // Skip subtasks in project progress calculation - only count main tasks
      if (parentTaskId) {
        // This is a subtask, skip it for project progress but count for status counts
        // Status counts should include all tasks (main + subtasks)
      } else {

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

        // Track project progress by projectId (only for main tasks, not subtasks)
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
      }

      // Track employee workload - use name if available, otherwise email
      if (assignedTo) {
        const employeeName = userEmailToNameMap[assignedTo.toLowerCase()] || assignedTo;
        if (!employeeWorkload[employeeName]) {
          employeeWorkload[employeeName] = 0;
        }
        employeeWorkload[employeeName]++;
      }

      // Check for overdue tasks - exclude tasks from completed projects
      if (dueDate && statusLower !== "completed") {
        // Skip if project is completed
        if (projectStatusMap[projectId]) {
          // Project is completed, skip this task
        } else {
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
      }
    });

    // Calculate % completion per project
    // Use actual progress from Projects sheet if available, otherwise calculate from tasks
    const projectCompletion = Object.values(projectProgress).map((data) => {
      // Get actual progress from Projects sheet
      const projectRow = (projectRows || []).find((r) => r[0] === data.projectId);
      let progress = 0;
      
      if (projectRow && projectRow[7]) {
        // Use stored progress from Projects sheet (column 7 = Progress)
        progress = Number(projectRow[7]) || 0;
      } else {
        // Fallback: calculate from tasks if progress not stored
        progress = data.total > 0 
          ? Math.round((data.completed / data.total) * 100) 
          : 0;
      }
      
      return {
        projectId: data.projectId,
        project: data.name,
        totalTasks: data.total,
        completedTasks: data.completed,
        progress: Math.max(0, Math.min(100, progress)), // Ensure 0-100 range
      };
    });

    // Sort projects by progress (descending)
    projectCompletion.sort((a, b) => b.progress - a.progress);

    // Sort employee workload by count (descending) and convert to array format
    const sortedEmployeeWorkload = Object.entries(employeeWorkload)
      .sort(([, a], [, b]) => b - a)
      .reduce((acc, [employeeName, count]) => {
        acc[employeeName] = count;
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
