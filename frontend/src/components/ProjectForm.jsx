import React, { useState, useEffect } from "react";
import { uploadFiles } from "../services/uploadService";

export default function ProjectForm({ initial = {}, onSave, onCancel }) {
  // initial = { id, name, description, startDate, endDate, status, owner, progress, attachments }
  const [form, setForm] = useState({
    name: initial.name || "",
    description: initial.description || "",
    startDate: initial.startDate || "",
    endDate: initial.endDate || "",
    owner: initial.owner || "",
    attachments: initial.attachments || [],
    // Note: status and progress are read-only, calculated from tasks
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      name: initial.name || "",
      description: initial.description || "",
      startDate: initial.startDate || "",
      endDate: initial.endDate || "",
      owner: initial.owner || "",
      attachments: initial.attachments || [],
      // Note: status and progress are read-only, calculated from tasks
    });
    setSelectedFiles([]);
  }, [initial]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

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
    setError("");
    if (!form.name) return setError("Project name is required");
    
    setLoading(true);
    setUploading(true);
    try {
      let attachmentUrls = Array.isArray(form.attachments) ? [...form.attachments] : [];
      
      // Upload new files if any
      if (selectedFiles.length > 0) {
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
          alert(`File upload failed: ${errorMessage}\n\nProject will be saved without the new attachments.`);
          // Continue with saving the project even if file upload fails
        }
      }
      
      // Build payload with attachment URLs
      const payload = {
        ...form,
        attachments: attachmentUrls,
      };
      
      await onSave(payload); // parent passes createProject/updateProject
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setLoading(false);
      setUploading(false);
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

      <label className="block mb-2">
        <span className="text-sm">Attachments (optional) - PDF and Documents only</span>
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

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
        <button type="submit" disabled={loading || uploading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {uploading ? "Uploading..." : loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
