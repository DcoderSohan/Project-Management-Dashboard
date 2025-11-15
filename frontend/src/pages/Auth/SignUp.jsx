import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { FaLock, FaEnvelope, FaUser, FaSpinner, FaCheck } from "react-icons/fa";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validation
    if (!email || !password || !confirmPassword || !role) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    // If role is admin, check if email matches admin email
    if (role === "admin" && email.toLowerCase().trim() !== "sohansarang067@gmail.com") {
      setError("Only admin email (sohansarang067@gmail.com) can be used for admin role");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // Sign up user
      console.log("Attempting to signup...");
      const response = await authService.signup(email.trim(), password, role);
      console.log("Signup response:", response);
      
      if (response.user) {
        // Account created successfully, redirect to login page
        setSuccess(`${role === "admin" ? "Admin" : "User"} account created successfully! Redirecting to login...`);
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(response.error || "Failed to create account");
      }
    } catch (error) {
      console.error("Signup error:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
      });
      
      if (error.response?.status === 404) {
        setError("Backend server not found. Please make sure the backend server is running on port 5000.");
      } else if (error.response?.status === 500) {
        setError(error.response?.data?.error || "Server error. Please check backend logs.");
      } else {
        setError(error.response?.data?.error || error.message || "Failed to create admin account. Please check if backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 rounded-full p-4">
                <FaUser className="text-green-600 text-4xl" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Sign Up
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Create your account for Project Management Dashboard
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <strong className="font-bold">Error: </strong>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              <strong className="font-bold">Success: </strong>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                <FaUser className="inline mr-2" />
                Role
              </label>
              <select
                id="role"
                name="role"
                required
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  // If admin role selected, set admin email
                  if (e.target.value === "admin") {
                    setEmail("sohansarang067@gmail.com");
                  } else {
                    setEmail("");
                  }
                }}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {role === "admin" 
                  ? "Admin role requires email: sohansarang067@gmail.com" 
                  : "Select your role for this account"}
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <FaEnvelope className="inline mr-2" />
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={role === "admin" ? "sohansarang067@gmail.com" : "Enter your email"}
                readOnly={role === "admin"}
              />
              {role === "admin" && (
                <p className="mt-1 text-xs text-gray-500">
                  Admin email is fixed
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                <FaLock className="inline mr-2" />
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password (min 6 characters)"
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                <FaLock className="inline mr-2" />
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm your password"
                minLength={6}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <FaCheck className="mr-2" />
                    Create Account
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Login here
              </Link>
            </p>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> Your credentials will be saved in:
              <br />• <strong>Google Sheets:</strong> "AuthUsers" sheet (password is hashed)
              <br />• <strong>Backend:</strong> backend/controllers/authController.js (line 16 - email reference only)
              <br />• Password is NOT stored in code - only in Google Sheets
              <br />See <code>CREDENTIALS_LOCATION.md</code> for details
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

