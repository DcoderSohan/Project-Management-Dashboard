import React, { useState, useEffect } from "react";

export default function TaskForm({
  initial = {},
  onSave,
  onCancel,
  users = [],
  projects = [],
  tasks = [], // For selecting parent task
}) {
  const [form, setForm] = useState({
    title: initial.title || "",
    description: initial.description || "",
    assignedTo: initial.assignedTo || "",
    startDate: initial.startDate || "",
    endDate: initial.endDate || "",
    dueDate: initial.dueDate || "",
    status: initial.status || "Not Started",
    projectId: initial.projectId || "",
    parentTaskId: initial.parentTaskId || "",
  });

  useEffect(() => {
    setForm({
      title: initial.title || "",
      description: initial.description || "",
      assignedTo: initial.assignedTo || "",
      startDate: initial.startDate || "",
      endDate: initial.endDate || "",
      dueDate: initial.dueDate || "",
      status: initial.status || "Not Started",
      projectId: initial.projectId || "",
      parentTaskId: initial.parentTaskId || "",
    });
  }, [initial]);

  const change = (e) => {
    const newForm = { ...form, [e.target.name]: e.target.value };
    
    // If parent task is selected, auto-set projectId from parent task
    if (e.target.name === "parentTaskId" && e.target.value) {
      const parentTask = tasks.find(t => t.id === e.target.value);
      if (parentTask && parentTask.projectId) {
        newForm.projectId = parentTask.projectId;
      }
    }
    
    // If parent task is cleared, allow project selection again
    if (e.target.name === "parentTaskId" && !e.target.value) {
      // Keep current projectId if it exists, otherwise clear it
    }
    
    setForm(newForm);
  };

  const submit = async (e) => {
    e.preventDefault();
    
    // For subtasks, projectId is inherited from parent, so we don't require it in the form
    // But we still need to ensure it's set before saving
    if (!form.title) {
      return alert("Title is required");
    }
    
    // If it's a subtask (has parentTaskId), ensure projectId is set from parent
    if (form.parentTaskId && !form.projectId) {
      const parentTask = tasks.find(t => t.id === form.parentTaskId);
      if (parentTask && parentTask.projectId) {
        form.projectId = parentTask.projectId;
      } else {
        return alert("Cannot create subtask: Parent task project not found");
      }
    }
    
    // For main tasks, projectId is required
    if (!form.parentTaskId && !form.projectId) {
      return alert("Project is required for main tasks");
    }
    
    try {
      const payload = { ...form };
      // Clear the ID if it's a new task (not editing)
      if (!initial.id) {
        delete payload.id;
      }
      await onSave(payload);
    } catch (error) {
      console.error("Error in task submission:", error);
      alert(`Failed to save task: ${error.message || "Unknown error"}`);
    }
  };

  return (
    <form onSubmit={submit} className="w-full">

      <label className="block mb-2">
        <span>Title</span>
        <input
          name="title"
          value={form.title}
          onChange={change}
          className="mt-1 block w-full p-2 border rounded"
        />
      </label>

      <label className="block mb-2">
        <span>Description</span>
        <textarea
          name="description"
          value={form.description}
          onChange={change}
          className="mt-1 block w-full p-2 border rounded"
          rows={4}
        />
      </label>

      <label className="block mb-2">
        <span>Status</span>
        <select
          name="status"
          value={form.status}
          onChange={change}
          className="mt-1 block w-full p-2 border rounded"
        >
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Blocked">Blocked</option>
        </select>
      </label>

      <label className="block mb-2">
        <span>Project</span>
        <select
          name="projectId"
          value={form.projectId}
          onChange={change}
          className="mt-1 block w-full p-2 border rounded"
          disabled={!!form.parentTaskId} // Disable if this is a subtask
        >
          <option value="">-- select project --</option>
          {projects.map((pr, idx) => (
            <option key={pr.id || `project-${idx}`} value={pr.id}>
              {pr.name}
            </option>
          ))}
        </select>
      </label>

      {/* Only show parent task selector if not already set as a subtask */}
      {!form.parentTaskId && (
        <label className="block mb-2">
          <span>Parent Task (Optional - leave empty for main task)</span>
          <select
            name="parentTaskId"
            value={form.parentTaskId}
            onChange={change}
            className="mt-1 block w-full p-2 border rounded"
          >
            <option value="">-- No parent (Main Task) --</option>
            {tasks
              .filter((t) => !t.parentTaskId && t.id !== initial.id) // Only show main tasks, exclude current task
              .filter((t) => !form.projectId || t.projectId === form.projectId) // Filter by selected project
              .map((t, idx) => (
                <option key={t.id || `task-${idx}`} value={t.id}>
                  {t.title} {t.projectId && `(${projects.find(p => p.id === t.projectId)?.name || t.projectId})`}
                </option>
              ))}
          </select>
        </label>
      )}
      
      {/* Show parent task info if this is a subtask */}
      {form.parentTaskId && (
        <div className="block mb-2 p-3 bg-purple-50 border border-purple-200 rounded">
          <p className="text-sm font-medium text-purple-800">
            This is a subtask of: {tasks.find(t => t.id === form.parentTaskId)?.title || form.parentTaskId}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            Project is inherited from parent task and cannot be changed.
          </p>
        </div>
      )}

      <label className="block mb-2">
        <span>Assigned To</span>
        <select
          name="assignedTo"
          value={form.assignedTo}
          onChange={change}
          className="mt-1 block w-full p-2 border rounded"
        >
          <option value="">Unassigned</option>
          {users.map((u, idx) => (
            <option key={u.id || `user-${idx}`} value={u.email}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <label className="block">
          <span>Start Date</span>
          <input
            type="date"
            name="startDate"
            value={form.startDate}
            onChange={change}
            className="mt-1 block w-full p-2 border rounded"
          />
        </label>
        <label className="block">
          <span>End Date</span>
          <input
            type="date"
            name="endDate"
            value={form.endDate}
            onChange={change}
            className="mt-1 block w-full p-2 border rounded"
          />
        </label>
        <label className="block">
          <span>Due Date</span>
          <input
            type="date"
            name="dueDate"
            value={form.dueDate}
            onChange={change}
            className="mt-1 block w-full p-2 border rounded"
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Save
        </button>
      </div>
    </form>
  );
}
