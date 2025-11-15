import React, { useState, useEffect } from "react";

export default function UserForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({ name: "", email: "", role: "Employee", department: "" });

  useEffect(() => setForm({ 
    name: initial.name || "", email: initial.email || "", role: initial.role || "Employee", department: initial.department || ""
  }), [initial]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return alert("Name & email required");
    await onSave(form);
  };

  return (
    <form className="w-full" onSubmit={submit}>
      <label className="block mb-2">
        <span>Name</span>
        <input name="name" value={form.name} onChange={change} className="mt-1 block w-full p-2 border rounded" />
      </label>
      <label className="block mb-2">
        <span>Email</span>
        <input name="email" value={form.email} onChange={change} className="mt-1 block w-full p-2 border rounded" />
      </label>
      <label className="block mb-2">
        <span>Role</span>
        <input name="role" value={form.role} onChange={change} className="mt-1 block w-full p-2 border rounded" />
      </label>
      <label className="block mb-2">
        <span>Department</span>
        <input name="department" value={form.department} onChange={change} className="mt-1 block w-full p-2 border rounded" />
      </label>

      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
      </div>
    </form>
  );
}
