import React, { useState, useEffect } from "react";
import { uploadFiles } from "../services/uploadService";

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
    attachments: initial.attachments || [],
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

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
      attachments: initial.attachments || [],
    });
    setSelectedFiles([]);
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

  const onFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file types
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    
    const validFiles = [];
    const invalidFiles = [];
    
    files.forEach(file => {
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
      
      if (isValidType) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });
    
    if (invalidFiles.length > 0) {
      alert(`Invalid file type(s): ${invalidFiles.join(', ')}\n\nPlease upload only PDF, DOC, or DOCX files.`);
    }
    
    if (validFiles.length > 5) {
      alert('Maximum 5 files allowed. Only the first 5 files will be uploaded.');
      setSelectedFiles(validFiles.slice(0, 5));
    } else {
      setSelectedFiles(validFiles);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.projectId) {
      return alert("Title and project are required");
    }
    
    setUploading(true);
    try {
      let attachmentUrls = Array.isArray(form.attachments) ? [...form.attachments] : [];
      
      // Upload new files if any (only for main tasks, not subtasks)
      if (selectedFiles.length > 0 && !form.parentTaskId) {
        console.log("Uploading files:", selectedFiles.map(f => f.name));
        try {
          const urls = await uploadFiles(selectedFiles);
          console.log("Uploaded files, got URLs:", urls);
          if (urls && urls.length > 0) {
            // Create file metadata objects with name, url, size, and upload date
            const newFileMetadata = urls.map((url, index) => {
              const file = selectedFiles[index];
              return {
                url: url,
                name: file.name,
                size: file.size,
                uploadDate: new Date().toISOString(),
                type: file.name.split('.').pop() || 'unknown'
              };
            });
            
            // Merge with existing attachments (preserve existing metadata if objects, convert URLs if strings)
            const existingAttachments = (form.attachments || []).map(att => {
              if (typeof att === 'string') {
                // Convert old URL format to object
                const fileName = att.split('/').pop() || att.split('\\').pop() || 'File';
                return {
                  url: att,
                  name: fileName,
                  size: null,
                  uploadDate: new Date().toISOString(),
                  type: fileName.split('.').pop() || 'unknown'
                };
              }
              return att;
            });
            
            attachmentUrls = [...existingAttachments, ...newFileMetadata];
          }
        } catch (uploadError) {
          console.error("File upload error:", uploadError);
          const errorMessage = uploadError.message || "Failed to upload files";
          alert(`File upload failed: ${errorMessage}\n\nTask will be saved without the new attachments.`);
          // Continue with saving the task even if file upload fails
        }
      }
      
      // Clear attachments for subtasks
      if (form.parentTaskId) {
        attachmentUrls = [];
      }

      // Build payload with attachment URLs
      const payload = {
        ...form,
        attachments: attachmentUrls,
      };

      console.log("📎 Saving task with payload:");
      console.log("📎 - Title:", payload.title);
      console.log("📎 - Project ID:", payload.projectId);
      console.log("📎 - Attachments count:", attachmentUrls.length);
      console.log("📎 - Attachments data:", JSON.stringify(attachmentUrls, null, 2));
      await onSave(payload);
    } catch (error) {
      console.error("Error in task submission:", error);
      alert(`Failed to save task: ${error.message || "Unknown error"}`);
    } finally {
      setUploading(false);
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
        {form.parentTaskId && (
          <p className="text-xs text-gray-500 mt-1">
            This will be a subtask. Project will be inherited from parent task.
          </p>
        )}
      </label>

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

      {/* Only show attachments for main tasks, not subtasks */}
      {!form.parentTaskId && (
        <label className="block mb-2">
          <span>Attachments (optional) - PDF and Documents only</span>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            onChange={onFileChange}
            className="mt-1 block w-full p-2 border rounded"
            disabled={uploading}
          />
          <small className="text-gray-500 block mt-1">
            Accepted formats: PDF, DOC, DOCX (Max 5 files, 10MB each)
          </small>
          {selectedFiles.length > 0 && (
            <div className="mt-2 p-2 bg-blue-50 rounded">
              <small className="text-blue-700 block font-medium">
                {selectedFiles.length} file(s) selected:
              </small>
              <ul className="mt-1 text-sm text-blue-600">
                {selectedFiles.map((file, idx) => (
                  <li key={`selected-${file.name}-${idx}`}>• {file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                ))}
              </ul>
            </div>
          )}
          {form.attachments && form.attachments.length > 0 && (
            <div className="mt-2">
              <small className="text-gray-600 block mb-1">Existing attachments:</small>
              <ul className="list-disc list-inside text-sm text-gray-500">
                {form.attachments.map((att, idx) => {
                  const fileName = typeof att === 'object' ? att.name : (att.split('/').pop() || `Attachment ${idx + 1}`);
                  const fileUrl = typeof att === 'object' ? att.url : att;
                  return (
                    <li key={`attachment-${fileUrl}-${idx}`}>
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {fileName}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </label>
      )}

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
          disabled={uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Save"}
        </button>
      </div>
    </form>
  );
}
