import express from "express";
import {
  signup,
  checkAdminExists,
  login,
  verifyToken,
  getCurrentUser,
  updateProfile,
  createUser,
  getAllUsers,
  updateUser,
  deleteUser,
  getSessions,
} from "../controllers/authController.js";

const router = express.Router();

// Authentication routes
router.get("/check-admin", checkAdminExists); // Check if admin exists
router.post("/signup", signup); // Sign up admin (first time setup)
router.post("/login", login); // Login admin
router.get("/me", verifyToken, getCurrentUser);

// Profile routes
router.put("/profile", verifyToken, updateProfile);

// User management routes (admin only)
router.post("/users", verifyToken, createUser);
router.get("/users", verifyToken, getAllUsers);
router.put("/users/:id", verifyToken, updateUser);
router.delete("/users/:id", verifyToken, deleteUser);

// Sessions routes (admin only)
router.get("/sessions", verifyToken, getSessions);

export default router;
