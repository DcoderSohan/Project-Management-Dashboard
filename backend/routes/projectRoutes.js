import express from "express";
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from "../controllers/projectController.js";

const router = express.Router();

// Routes - RESTful conventions
router.post("/", createProject);           // Create: POST /api/projects
router.get("/", getAllProjects);           // Read all: GET /api/projects
router.get("/:id", getProjectById);        // Read one: GET /api/projects/:id
router.put("/:id", updateProject);          // Update: PUT /api/projects/:id
router.delete("/:id", deleteProject);       // Delete: DELETE /api/projects/:id

export default router;
