import express from "express";
import {
  shareProject,
  generateShareLink,
  getProjectShares,
  getUserSharedProjects,
  updateShare,
  removeShare,
  getProjectByToken,
} from "../controllers/accessController.js";

const router = express.Router();

// Share project with user
router.post("/share", shareProject);

// Generate shareable link
router.post("/generate-link", generateShareLink);

// Get all shares for a project
router.get("/project/:projectId", getProjectShares);

// Get all projects shared with a user
router.get("/user/:email", getUserSharedProjects);

// Get project by share token
router.get("/token/:token", getProjectByToken);

// Update share permission
router.put("/:id", updateShare);

// Remove share (revoke access)
router.delete("/:id", removeShare);

export default router;

