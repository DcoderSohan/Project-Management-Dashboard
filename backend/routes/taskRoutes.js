// backend/routes/taskRoutes.js
import express from "express";
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

const router = express.Router();

router.post("/", createTask);            // Create
router.get("/", getAllTasks);            // Read all (optionally ?projectId=)
router.get("/:id", getTaskById);         // Read one
router.put("/:id", updateTask);          // Update
router.delete("/:id", deleteTask);       // Delete

export default router;
