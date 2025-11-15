import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { uploadProfilePhoto } from "../services/profileUploadService";
import Navbar from "../components/Navbar";
import { FaUser, FaEnvelope, FaLock, FaCamera, FaSave, FaSpinner } from "react-icons/fa";

export default function Profile() {
  const { user, token, updateUser } = useAuth();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setProfilePhoto(user.profilePhoto || "");
    }
  }, [user]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Only JPG, PNG, GIF, and WEBP images are allowed.");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError("Profile photo must be less than 5MB");
        return;
      }
      
      setError(""); // Clear any previous errors
      setProfilePhotoFile(file);
      // Preview image
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate password change
    if (newPassword) {
      if (!currentPassword) {
        setError("Current password is required to change password");
        return;
      }
      
      if (newPassword.length < 6) {
        setError("New password must be at least 6 characters long");
        return;
      }
      
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match");
        return;
      }
    }

    setLoading(true);

    try {
      let photoUrl = profilePhoto;

      // Upload profile photo if new file is selected
      if (profilePhotoFile) {
        try {
          console.log("Uploading profile photo...");
          photoUrl = await uploadProfilePhoto(profilePhotoFile);
          console.log("Profile photo uploaded successfully:", photoUrl);
        } catch (uploadError) {
          console.error("Error uploading photo:", uploadError);
          setError(uploadError.message || "Failed to upload profile photo. Please try again.");
          setLoading(false);
          return;
        }
      }

      // Update profile
      const updateData = {
        email: email || user.email,
        profilePhoto: photoUrl,
      };

      // Add password change data if new password is provided
      if (newPassword) {
        updateData.newPassword = newPassword;
        updateData.currentPassword = currentPassword;
      }

      console.log("Updating profile...");
      const response = await authService.updateProfile(token, updateData);
      
      if (response && response.user) {
        // Update user in context
        updateUser(response.user);
        
        setSuccess("Profile updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setProfilePhotoFile(null);
      } else {
        setError("Failed to update profile. Please try again.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError(error.response?.data?.error || error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar title="Profile Settings" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <FaUser className="text-blue-600" />
            Profile Settings
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo */}
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="h-24 w-24 rounded-full object-cover border-4 border-blue-200"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center border-4 border-blue-200">
                    <FaUser className="text-blue-600 text-3xl" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                      disabled={loading}
                    />
                    <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed">
                      <FaCamera className="mr-2" />
                      {profilePhotoFile ? "Change Photo" : "Upload Photo"}
                    </span>
                  </label>
                  {profilePhotoFile && (
                    <span className="text-sm text-gray-500">
                      {profilePhotoFile.name}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Maximum file size: 5MB. Supported formats: JPG, PNG, GIF, WEBP
                </p>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <FaEnvelope className="inline mr-2" />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="sohansarang067@gmail.com"
              />
            </div>

            {/* Current Password - shown when user wants to change password */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                <FaLock className="inline mr-2" />
                Current Password (required to change password)
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Enter current password (only if changing password)"
              />
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                <FaLock className="inline mr-2" />
                New Password (leave empty to keep current password)
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Enter new password (optional)"
              />
            </div>

            {/* Confirm New Password */}
            {newPassword && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  <FaLock className="inline mr-2" />
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="Confirm new password"
                />
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
