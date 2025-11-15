import React, { useState, useEffect } from "react";

export default function ProjectForm({ initial = {}, onSave, onCancel }) {
  // initial = { id, name, description, startDate, endDate, status, owner, progress }
  const [form, setForm] = useState({
    name: initial.name || "",
    description: initial.description || "",
    startDate: initial.startDate || "",
    endDate: initial.endDate || "",
    status: initial.status || "Not Started",
    owner: initial.owner || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      name: initial.name || "",
      description: initial.description || "",
      startDate: initial.startDate || "",
      endDate: initial.endDate || "",
      status: initial.status || "Not Started",
      owner: initial.owner || "",
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

      <div className="grid grid-cols-2 gap-2 mb-4">
        <label>
          <span className="text-sm">Status</span>
          <select name="status" value={form.status} onChange={change}
            className="mt-1 block w-full border rounded p-2">
            <option>Not Started</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>Blocked</option>
          </select>
        </label>

        <label>
          <span className="text-sm">Owner (email)</span>
          <input name="owner" value={form.owner} onChange={change}
            className="mt-1 block w-full border rounded p-2" />
        </label>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
