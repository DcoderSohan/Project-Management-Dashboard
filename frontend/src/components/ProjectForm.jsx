import React, { useState, useEffect } from "react";

export default function ProjectForm({ initial = {}, onSave, onCancel }) {
  // initial = { id, name, description, startDate, endDate, status, owner, progress }
  const [form, setForm] = useState({
    name: initial.name || "",
    description: initial.description || "",
    startDate: initial.startDate || "",
    endDate: initial.endDate || "",
    owner: initial.owner || "",
    // Note: status and progress are read-only, calculated from tasks
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      name: initial.name || "",
      description: initial.description || "",
      startDate: initial.startDate || "",
      endDate: initial.endDate || "",
      owner: initial.owner || "",
      // Note: status and progress are read-only, calculated from tasks
    });
  }, [initial]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name) return setError("Project name is required");
    
    setLoading(true);
    try {
      await onSave(form); // parent passes createProject/updateProject
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="w-full" onSubmit={submit}>

      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

      <label className="block mb-2">
        <span className="text-sm">Name</span>
        <input name="name" value={form.name} onChange={change}
          className="mt-1 block w-full border rounded p-2" />
      </label>

      <label className="block mb-2">
        <span className="text-sm">Description</span>
        <textarea name="description" value={form.description} onChange={change}
          className="mt-1 block w-full border rounded p-2" rows={4} />
      </label>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <label>
          <span className="text-sm">Start Date</span>
          <input type="date" name="startDate" value={form.startDate} onChange={change}
             className="mt-1 block w-full border rounded p-2" />
        </label>
        <label>
          <span className="text-sm">End Date</span>
          <input type="date" name="endDate" value={form.endDate} onChange={change}
             className="mt-1 block w-full border rounded p-2" />
        </label>
      </div>

      <div className="mb-4">
        {initial.id && initial.status && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <span className="text-sm font-medium text-blue-800">Status: </span>
            <span className="text-sm text-blue-600">{initial.status}</span>
            <p className="text-xs text-blue-600 mt-1">
              ⚠️ Status is automatically calculated from task completion. It cannot be changed manually.
            </p>
          </div>
        )}
        
        <label>
          <span className="text-sm">Owner (email)</span>
          <input name="owner" value={form.owner} onChange={change}
            className="mt-1 block w-full border rounded p-2" />
        </label>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
