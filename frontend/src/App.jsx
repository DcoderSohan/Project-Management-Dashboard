import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Timeline from "./pages/Timeline";
import Users from "./pages/Users";
import LoggedInUsers from "./pages/LoggedInUsers";
import Login from "./pages/Auth/Login";
import SignUp from "./pages/Auth/SignUp";
import Profile from "./pages/Profile";
import UserManagement from "./pages/UserManagement";

function App() {
  return (
        <BrowserRouter>
          <Routes>
        {/* Public routes */}
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        
        {/* Public shared project route - accessible without login via share link */}
        <Route
          path="/projects/shared/:token"
          element={<Projects />}
        />
        
        {/* Protected routes (accessible to all authenticated users) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timeline"
          element={
            <ProtectedRoute>
              <Timeline />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        
        {/* Admin-only routes */}
        <Route
          path="/logged-in-users"
          element={
            <AdminRoute>
              <LoggedInUsers />
            </AdminRoute>
          }
        />
        <Route
          path="/user-management"
          element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          }
        />
        
        {/* Catch-all route - redirect to signup for any unmatched routes */}
        <Route path="*" element={<Navigate to="/signup" replace />} />
          </Routes>
        </BrowserRouter>
  );
}

export default App;
