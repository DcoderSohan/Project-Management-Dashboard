/**
 * Utility functions for detecting task overlaps
 */

/**
 * Check if two date ranges overlap
 * @param {string} start1 - Start date of first range (YYYY-MM-DD)
 * @param {string} end1 - End date of first range (YYYY-MM-DD)
 * @param {string} start2 - Start date of second range (YYYY-MM-DD)
 * @param {string} end2 - End date of second range (YYYY-MM-DD)
 * @returns {boolean} - True if ranges overlap
 */
export function datesOverlap(start1, end1, start2, end2) {
  if (!start1 || !end1 || !start2 || !end2) {
    return false;
  }

  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);

  // Check if ranges overlap
  // Two ranges overlap if: start1 <= end2 && start2 <= end1
  return s1 <= e2 && s2 <= e1;
}

/**
 * Check if two tasks overlap
 * @param {Object} task1 - First task object
 * @param {Object} task2 - Second task object
 * @returns {boolean} - True if tasks overlap
 */
export function tasksOverlap(task1, task2) {
  if (!task1.startDate || !task1.endDate || !task2.startDate || !task2.endDate) {
    return false;
  }

  return datesOverlap(
    task1.startDate,
    task1.endDate,
    task2.startDate,
    task2.endDate
  );
}

/**
 * Find all overlapping tasks for a given task
 * @param {Object} task - Task to check
 * @param {Array} allTasks - Array of all tasks
 * @returns {Array} - Array of task IDs that overlap with the given task
 */
export function findOverlappingTasks(task, allTasks) {
  if (!task.startDate || !task.endDate) {
    return [];
  }

  return allTasks
    .filter((t) => {
      // Don't check against itself
      if (t.id === task.id) return false;
      // Only check tasks with dates
      if (!t.startDate || !t.endDate) return false;
      // Check if they overlap
      return tasksOverlap(task, t);
    })
    .map((t) => t.id);
}

/**
 * Check if a task overlaps with any other task in the list
 * @param {Object} task - Task to check
 * @param {Array} allTasks - Array of all tasks
 * @returns {boolean} - True if task overlaps with any other task
 */
export function hasOverlaps(task, allTasks) {
  return findOverlappingTasks(task, allTasks).length > 0;
}

/**
 * Get overlap warnings for a list of tasks
 * @param {Array} tasks - Array of tasks
 * @returns {Object} - Object mapping task IDs to arrays of overlapping task IDs
 */
export function getOverlapWarnings(tasks) {
  const warnings = {};

  tasks.forEach((task) => {
    if (task.startDate && task.endDate) {
      const overlapping = findOverlappingTasks(task, tasks);
      if (overlapping.length > 0) {
        warnings[task.id] = overlapping;
      }
    }
  });

  return warnings;
}

