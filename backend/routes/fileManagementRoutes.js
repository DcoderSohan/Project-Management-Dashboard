import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { verifyToken } from "../controllers/authController.js";
import { readSheetValues } from "../services/googleSheetService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Validate Cloudinary configuration
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

const useCloudinary = cloudinaryConfig.cloud_name && cloudinaryConfig.api_key && cloudinaryConfig.api_secret;

if (!useCloudinary) {
  // Create uploads directory structure if it doesn't exist
  const uploadsDir = path.join(__dirname, "../uploads/files");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("✅ Created file management uploads directory");
  }
} else {
  cloudinary.config(cloudinaryConfig);
}

// File filter - allow common file types
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/zip',
    'application/x-zip-compressed'
  ];
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.zip'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, TXT, Images, ZIP. Received: ${file.mimetype || fileExtension}`), false);
  }
};

// Configure multer storage
let storage;
if (useCloudinary) {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
      const projectId = req.body.projectId || 'general';
      const taskId = req.body.taskId || 'general';
      return {
        folder: `project_dashboard/files/${projectId}/${taskId}`,
        allowed_formats: ["pdf", "doc", "docx", "xls", "xlsx", "txt", "jpg", "jpeg", "png", "gif", "zip"],
      };
    },
  });
} else {
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const projectId = req.body.projectId || 'general';
      const taskId = req.body.taskId || 'general';
      const uploadDir = path.join(__dirname, "../uploads/files", projectId, taskId);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  });
}

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Middleware to check admin access
const requireAdmin = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// GET /api/file-management - List files by project and task
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { projectId, taskId } = req.query;
    
    // Get projects and tasks for context
    const { rows: projectRows } = await readSheetValues("Projects");
    const { rows: taskRows } = await readSheetValues("Tasks");
    
    const projects = (projectRows || []).map(row => ({
      id: row[0],
      name: row[1]
    }));
    
    const tasks = (taskRows || []).map(row => ({
      id: row[0],
      title: row[2],
      projectId: row[1]
    }));
    
    let files = [];
    
    if (useCloudinary) {
      // List files from Cloudinary
      try {
        const folders = [];
        if (projectId) {
          if (taskId) {
            folders.push(`project_dashboard/files/${projectId}/${taskId}`);
          } else {
            folders.push(`project_dashboard/files/${projectId}`);
          }
        } else {
          folders.push(`project_dashboard/files`);
        }
        
        for (const folder of folders) {
          const result = await cloudinary.search
            .expression(`folder:${folder}`)
            .sort_by([['created_at', 'desc']])
            .max_results(500)
            .execute();
          
          if (result.resources) {
            files = files.concat(result.resources.map(resource => ({
              id: resource.public_id,
              name: resource.filename || resource.public_id.split('/').pop(),
              url: resource.secure_url,
              size: resource.bytes,
              format: resource.format,
              createdAt: resource.created_at,
              folder: resource.folder,
              projectId: resource.folder?.split('/')[2] || null,
              taskId: resource.folder?.split('/')[3] || null,
            })));
          }
        }
      } catch (cloudinaryError) {
        console.error("Cloudinary search error:", cloudinaryError);
      }
    } else {
      // List files from local storage
      const baseDir = path.join(__dirname, "../uploads/files");
      
      if (projectId) {
        const projectDir = path.join(baseDir, projectId);
        if (taskId) {
          const taskDir = path.join(projectDir, taskId);
          if (fs.existsSync(taskDir)) {
            const fileList = fs.readdirSync(taskDir);
            files = fileList.map(filename => {
              const filePath = path.join(taskDir, filename);
              const stats = fs.statSync(filePath);
              return {
                id: `${projectId}/${taskId}/${filename}`,
                name: filename,
                url: `/uploads/files/${projectId}/${taskId}/${filename}`,
                size: stats.size,
                format: path.extname(filename).slice(1),
                createdAt: stats.birthtime.toISOString(),
                projectId: projectId,
                taskId: taskId,
              };
            });
          }
        } else {
          // List all tasks in project
          if (fs.existsSync(projectDir)) {
            const taskDirs = fs.readdirSync(projectDir, { withFileTypes: true })
              .filter(dirent => dirent.isDirectory())
              .map(dirent => dirent.name);
            
            for (const taskDirName of taskDirs) {
              const taskDir = path.join(projectDir, taskDirName);
              const fileList = fs.readdirSync(taskDir);
              fileList.forEach(filename => {
                const filePath = path.join(taskDir, filename);
                const stats = fs.statSync(filePath);
                files.push({
                  id: `${projectId}/${taskDirName}/${filename}`,
                  name: filename,
                  url: `/uploads/files/${projectId}/${taskDirName}/${filename}`,
                  size: stats.size,
                  format: path.extname(filename).slice(1),
                  createdAt: stats.birthtime.toISOString(),
                  projectId: projectId,
                  taskId: taskDirName,
                });
              });
            }
          }
        }
      } else {
        // List all projects
        if (fs.existsSync(baseDir)) {
          const projectDirs = fs.readdirSync(baseDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
          
          for (const projectDirName of projectDirs) {
            const projectDir = path.join(baseDir, projectDirName);
            const taskDirs = fs.readdirSync(projectDir, { withFileTypes: true })
              .filter(dirent => dirent.isDirectory())
              .map(dirent => dirent.name);
            
            for (const taskDirName of taskDirs) {
              const taskDir = path.join(projectDir, taskDirName);
              const fileList = fs.readdirSync(taskDir);
              fileList.forEach(filename => {
                const filePath = path.join(taskDir, filename);
                const stats = fs.statSync(filePath);
                files.push({
                  id: `${projectDirName}/${taskDirName}/${filename}`,
                  name: filename,
                  url: `/uploads/files/${projectDirName}/${taskDirName}/${filename}`,
                  size: stats.size,
                  format: path.extname(filename).slice(1),
                  createdAt: stats.birthtime.toISOString(),
                  projectId: projectDirName,
                  taskId: taskDirName,
                });
              });
            }
          }
        }
      }
    }
    
    // Enrich with project and task names
    const enrichedFiles = files.map(file => {
      const project = projects.find(p => p.id === file.projectId);
      const task = tasks.find(t => t.id === file.taskId);
      return {
        ...file,
        projectName: project?.name || file.projectId,
        taskTitle: task?.title || file.taskId,
      };
    });
    
    res.json({
      success: true,
      files: enrichedFiles,
      projects: projects,
      tasks: tasks,
    });
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({ 
      error: "Failed to list files", 
      message: error.message 
    });
  }
});

// POST /api/file-management/upload - Upload file for project/task
router.post("/upload", verifyToken, requireAdmin, upload.array("files", 10), async (req, res) => {
  try {
    const { projectId, taskId } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    
    const uploadedFiles = req.files.map(file => {
      let url;
      if (useCloudinary) {
        url = file.path || file.url || file.secure_url;
      } else {
        const baseUrl = process.env.BASE_URL || process.env.VITE_API_URL?.replace('/api', '') || `http://localhost:${process.env.PORT || 5000}`;
        url = `${baseUrl}${file.path.replace(path.join(__dirname, "../"), "/")}`;
      }
      return {
        id: useCloudinary ? file.public_id : `${projectId}/${taskId}/${file.filename}`,
        name: file.originalname,
        url: url,
        size: file.size,
        format: path.extname(file.originalname).slice(1),
        projectId: projectId || 'general',
        taskId: taskId || 'general',
      };
    });
    
    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({ 
      error: "Failed to upload files", 
      message: error.message 
    });
  }
});

// DELETE /api/file-management/:id - Delete file
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId, taskId } = req.query;
    
    if (useCloudinary) {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(id);
    } else {
      // Delete from local storage
      const filePath = path.join(__dirname, "../uploads/files", projectId || 'general', taskId || 'general', id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      } else {
        return res.status(404).json({ error: "File not found" });
      }
    }
    
    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ 
      error: "Failed to delete file", 
      message: error.message 
    });
  }
});

export default router;

