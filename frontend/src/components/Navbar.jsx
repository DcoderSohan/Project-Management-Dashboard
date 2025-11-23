import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaClock, FaUsers, FaUser, FaSignOutAlt, FaCog } from "react-icons/fa";

export default function Navbar({ title }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  // Base navigation links available to all users
  const baseNavLinks = [
    { path: "/", label: "Dashboard" },
    { path: "/projects", label: "Projects" },
    { path: "/tasks", label: "Tasks" },
    { path: "/timeline", label: "Timeline" },
    { path: "/users", label: "Users" },
  ];

  // Admin-only navigation links
  const adminNavLinks = [
    { path: "/logged-in-users", label: "Logged In Users", icon: FaUsers },
    { path: "/user-management", label: "User Management", icon: FaUsers },
  ];

  // Combine links based on user role
  const navLinks = isAdmin 
    ? [...baseNavLinks, ...adminNavLinks]
    : baseNavLinks;

  const handleLogout = () => {
    logout();
    navigate("/signup");
  };

  return (
    <nav className="bg-white shadow flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <FaClock className="text-green-600" />
          <h1 className="font-semibold text-lg">{title}</h1>
        </div>
        <div className="flex gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  location.pathname === link.path
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {Icon && <Icon />}
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            {user.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt={user.email}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FaUser className="text-blue-600 text-sm" />
              </div>
            )}
            <span className="text-sm text-gray-600 hidden md:block">
              {user.email}
            </span>
            <Link
              to="/profile"
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Profile"
            >
              <FaCog />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              title="Logout"
            >
              <FaSignOutAlt />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
