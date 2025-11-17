# Project Management Dashboard

A full-stack project management application with task tracking, timeline visualization, and overlap detection.

## Features

- Project and Task Management
- Timeline/Gantt Chart View
- Task Overlap Detection
- User Management
- Dashboard Analytics

## How to Check if 2 Tasks are Overlapped

The application has built-in functionality to detect overlapping tasks. Here are the different ways to check for task overlaps:

### 1. Using the Timeline Page (Visual Method)

The easiest way to check for overlapping tasks is through the **Timeline** page:

1. Navigate to the **Timeline** page in the application
2. The page automatically detects and displays overlapping tasks
3. You'll see:
   - A warning indicator showing the number of tasks with overlaps
   - A detailed list of which tasks overlap with each other
   - A checkbox option to "Show overlapping tasks only" to filter the view

### 2. Using the Task Overlap Utility Functions (Programmatic Method)

The application includes utility functions in `frontend/src/utils/taskOverlap.js` that you can use programmatically:

#### Check if Two Tasks Overlap

```javascript
import { tasksOverlap } from '../utils/taskOverlap';

// Check if two tasks overlap
const task1 = {
  id: 1,
  title: "Task 1",
  startDate: "2024-01-01",
  endDate: "2024-01-10"
};

const task2 = {
  id: 2,
  title: "Task 2",
  startDate: "2024-01-05",
  endDate: "2024-01-15"
};

const areOverlapping = tasksOverlap(task1, task2);
// Returns: true (because Task 2 starts before Task 1 ends)
```

#### Check if Two Date Ranges Overlap

```javascript
import { datesOverlap } from '../utils/taskOverlap';

// Check if two date ranges overlap
const overlaps = datesOverlap(
  "2024-01-01", // Start date 1
  "2024-01-10", // End date 1
  "2024-01-05", // Start date 2
  "2024-01-15"  // End date 2
);
// Returns: true
```

#### Find All Overlapping Tasks for a Specific Task

```javascript
import { findOverlappingTasks } from '../utils/taskOverlap';

// Find all tasks that overlap with a given task
const task = {
  id: 1,
  startDate: "2024-01-01",
  endDate: "2024-01-10"
};

const allTasks = [
  { id: 1, startDate: "2024-01-01", endDate: "2024-01-10" },
  { id: 2, startDate: "2024-01-05", endDate: "2024-01-15" },
  { id: 3, startDate: "2024-01-20", endDate: "2024-01-25" }
];

const overlappingTaskIds = findOverlappingTasks(task, allTasks);
// Returns: [2] (Task 2 overlaps with Task 1)
```

#### Get Overlap Warnings for All Tasks

```javascript
import { getOverlapWarnings } from '../utils/taskOverlap';

// Get all overlap warnings for a list of tasks
const tasks = [
  { id: 1, startDate: "2024-01-01", endDate: "2024-01-10" },
  { id: 2, startDate: "2024-01-05", endDate: "2024-01-15" },
  { id: 3, startDate: "2024-01-12", endDate: "2024-01-20" }
];

const warnings = getOverlapWarnings(tasks);
// Returns: {
//   1: [2],      // Task 1 overlaps with Task 2
//   2: [1, 3],   // Task 2 overlaps with Task 1 and Task 3
//   3: [2]       // Task 3 overlaps with Task 2
// }
```

### 3. Understanding Task Overlap Logic

Two tasks are considered overlapping if their date ranges intersect. The overlap detection uses the following logic:

- **Task 1**: Start Date = `start1`, End Date = `end1`
- **Task 2**: Start Date = `start2`, End Date = `end2`

**Overlap occurs when:** `start1 <= end2 AND start2 <= end1`

**Examples:**
- Task 1: Jan 1 - Jan 10, Task 2: Jan 5 - Jan 15 → **Overlaps** ✓
- Task 1: Jan 1 - Jan 10, Task 2: Jan 11 - Jan 20 → **No Overlap** ✗
- Task 1: Jan 1 - Jan 10, Task 2: Jan 10 - Jan 20 → **Overlaps** ✓ (touching at boundary)

### 4. Visual Indicators in the Application

When viewing tasks in the Timeline:
- **Yellow warning badges** indicate tasks with overlaps
- **Overlap details** show which specific tasks overlap
- **Filter option** to show only overlapping tasks
- **Gantt Chart** visually displays overlapping tasks with different colors

## Setup Instructions

### Backend Setup

```bash
cd backend
npm install
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Production Build

```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/` and will be automatically served by the backend server.

## Recent Fixes

### Fixed 404 Error on Page Reload

The application now properly handles client-side routing. When you reload any page (like `/projects` or `/tasks`), the server correctly serves the React app's `index.html` file, allowing the client-side router to handle the route.

**What was fixed:**
- Updated the catch-all route in `backend/server.js` from `app.use()` to `app.get("*")` to properly handle all non-API routes
- This ensures that all client-side routes work correctly when the page is reloaded

## License

MIT

