import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import UserForm from "../components/UserForm";
import { fetchUsers, createUser, updateUser, deleteUser } from "../services/userService";
import { FaPlus, FaEdit, FaTrash, FaUser, FaEnvelope, FaUserTag, FaBuilding } from "react-icons/fa";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]);
      const errorMessage = error.response?.data?.error || error.message || "Failed to load users";
      alert(`Failed to load users: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async (form) => {
    try {
      if (editing?.id) {
        await updateUser(editing.id, form);
      } else {
        await createUser(form);
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Failed to save user. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    if (!id) {
      alert("Error: No user ID provided");
      return;
    }

    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        const response = await deleteUser(id);
        console.log("Delete response:", response);
        await load();
        alert("User deleted successfully!");
      } catch (error) {
        console.error("Error deleting user:", error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to delete user";
        alert(`Failed to delete user: ${errorMessage}`);
      }
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      "Admin": "bg-purple-100 text-purple-800 border-purple-200",
      "Manager": "bg-blue-100 text-blue-800 border-blue-200",
      "Employee": "bg-green-100 text-green-800 border-green-200",
    };
    return styles[role] || styles["Employee"];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar title="Users Management" />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FaUser className="text-purple-600" />
                Users
              </h1>
              <p className="text-gray-600 mt-1">Manage team members and their roles</p>
            </div>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-2 font-semibold"
            >
              <FaPlus /> New User
            </button>
          </div>
        </div>

        {/* User Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-800">
                {editing ? "Edit User" : "New User"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-3xl font-light leading-none"
                aria-label="Close"
              >
                ×
              </button>
              </div>
              <div className="p-6">
              <UserForm
                initial={editing || {}}
                onSave={onSave}
                onCancel={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              />
              </div>
            </div>
          </div>
        )}

        {/* Users Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FaUser className="text-gray-400 text-6xl mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No users found</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first user</p>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Add User
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user, index) => (
              <div
                key={user.id || `user-${index}`}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{user.name}</h3>
                      <p className="text-gray-600 text-sm flex items-center gap-1 mt-1">
                        <FaEnvelope className="text-xs" />
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2">
                      <FaUserTag className="text-blue-500" />
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadge(user.role)}`}>
                        {user.role || "Employee"}
                      </span>
                    </div>
                    {user.department && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FaBuilding className="text-gray-400" />
                        <span>{user.department}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => { setEditing(user); setShowForm(true); }}
                      className="flex-1 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
