import React, { useState, useEffect } from "react";
import {
  shareProject,
  generateShareLink,
  getProjectShares,
  removeShare,
  updateShare,
} from "../services/accessService";
import { fetchUsers } from "../services/userService";
import {
  FaShare,
  FaUserPlus,
  FaLink,
  FaCopy,
  FaTrash,
  FaEdit,
  FaCheck,
  FaTimes,
  FaEye,
  FaUserEdit,
} from "react-icons/fa";

export default function ShareProjectModal({ project, onClose, currentUserEmail, currentUserName }) {
  const [shares, setShares] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Share form state
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState("viewer");
  const [shareName, setShareName] = useState("");

  // Link generation state
  const [linkPermission, setLinkPermission] = useState("viewer");
  const [shareLink, setShareLink] = useState("");
  const [linkToken, setLinkToken] = useState("");
  const [copied, setCopied] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editPermission, setEditPermission] = useState("viewer");

  useEffect(() => {
    loadShares();
    loadUsers();
  }, [project?.id]);

  const loadShares = async () => {
    if (!project?.id) return;
    try {
      const data = await getProjectShares(project.id);
      setShares(data);
    } catch (err) {
      console.error("Error loading shares:", err);
      setError("Failed to load shares");
    }
  };

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!shareEmail.trim()) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await shareProject({
        projectId: project.id,
        sharedWith: shareEmail.trim(),
        sharedWithName: shareName.trim() || shareEmail.trim(),
        permission: sharePermission,
        sharedBy: currentUserEmail || "",
        sharedByName: currentUserName || "",
      });

      setSuccess("Project shared successfully!");
      setShareEmail("");
      setShareName("");
      setSharePermission("viewer");
      await loadShares();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to share project");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await generateShareLink({
        projectId: project.id,
        permission: linkPermission,
        sharedBy: currentUserEmail || "",
        sharedByName: currentUserName || "",
      });

      setShareLink(result.shareLink);
      setLinkToken(result.shareToken);
      setSuccess("Shareable link generated!");
      await loadShares();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to generate link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemoveShare = async (id) => {
    if (!window.confirm("Are you sure you want to remove this share?")) return;

    try {
      await removeShare(id);
      setSuccess("Share removed successfully");
      await loadShares();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to remove share");
    }
  };

  const handleUpdateShare = async (id) => {
    try {
      await updateShare(id, { permission: editPermission });
      setSuccess("Permission updated successfully");
      setEditingId(null);
      await loadShares();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to update share");
    }
  };

  const getPermissionIcon = (permission) => {
    return permission === "editor" ? (
      <FaUserEdit className="text-blue-600" />
    ) : (
      <FaEye className="text-gray-600" />
    );
  };

  const getPermissionLabel = (permission) => {
    return permission === "editor" ? "Editor" : "Viewer";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <FaShare className="text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Share Project</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl font-light leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Project Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-1">{project?.name}</h3>
            {project?.description && (
              <p className="text-sm text-gray-600">{project.description}</p>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <FaTimes />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
              <FaCheck />
              <span>{success}</span>
            </div>
          )}

          {/* Share with User */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FaUserPlus className="text-blue-600" />
              Share with People
            </h3>
            <form onSubmit={handleShare} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    list="users-list"
                  />
                  <datalist id="users-list">
                    {users.map((user) => (
                      <option key={user.id} value={user.email}>
                        {user.name}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={shareName}
                    onChange={(e) => setShareName(e.target.value)}
                    placeholder="User name"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permission
                </label>
                <select
                  value={sharePermission}
                  onChange={(e) => setSharePermission(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="viewer">Viewer - Can view only</option>
                  <option value="editor">Editor - Can view and edit</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading || !shareEmail.trim()}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FaUserPlus />
                {loading ? "Sharing..." : "Share"}
              </button>
            </form>
          </div>

          {/* Generate Shareable Link */}
          <div className="mb-6 pb-6 border-b">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FaLink className="text-blue-600" />
              Shareable Link
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Permission
                </label>
                <select
                  value={linkPermission}
                  onChange={(e) => setLinkPermission(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="viewer">Viewer - Can view only</option>
                  <option value="editor">Editor - Can view and edit</option>
                </select>
              </div>
              <button
                onClick={handleGenerateLink}
                disabled={loading}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FaLink />
                {loading ? "Generating..." : "Generate Shareable Link"}
              </button>
              {shareLink && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">Share Link:</span>
                    <button
                      onClick={handleCopyLink}
                      className="ml-auto text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                    >
                      {copied ? (
                        <>
                          <FaCheck /> Copied!
                        </>
                      ) : (
                        <>
                          <FaCopy /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="w-full border rounded px-2 py-1 text-sm bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Current Shares */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              People with Access ({shares.length})
            </h3>
            {shares.length === 0 ? (
              <p className="text-gray-500 text-sm">No one has been shared with this project yet.</p>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getPermissionIcon(share.permission)}
                      <div>
                        <div className="font-medium text-gray-800">
                          {share.sharedWithName || share.sharedWith || "Link Share"}
                        </div>
                        {share.sharedWith && (
                          <div className="text-sm text-gray-500">{share.sharedWith}</div>
                        )}
                        {share.shareToken && (
                          <div className="text-xs text-gray-400">Link-based access</div>
                        )}
                      </div>
                      <span className="ml-auto px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {getPermissionLabel(share.permission)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {editingId === share.id ? (
                        <>
                          <select
                            value={editPermission}
                            onChange={(e) => setEditPermission(e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>
                          <button
                            onClick={() => handleUpdateShare(share.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-600 hover:text-gray-700"
                          >
                            <FaTimes />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(share.id);
                              setEditPermission(share.permission);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                            title="Edit permission"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleRemoveShare(share.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Remove access"
                          >
                            <FaTrash />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

