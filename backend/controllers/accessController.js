// backend/controllers/accessController.js
// Share/Collaboration functionality for projects

import {
  readSheetValues,
  appendRow,
  updateRow,
  deleteRowByIndex,
} from "../services/googleSheetService.js";
import { validateAccess, generateShareToken, PERMISSIONS } from "../models/accessModel.js";
import { sendEmail } from "../utils/sendEmail.js";

/**
 * Assumptions:
 * - Google Sheet has a tab named "Access" or "Shares"
 * - Row 1 is header with columns:
 *   ID | ProjectID | SharedWith | SharedWithName | Permission | SharedBy | SharedByName | ShareToken | CreatedAt | ExpiresAt
 */

const SHEET_NAME = "Access";
const HEADER_COLUMNS = [
  "ID",
  "ProjectID",
  "SharedWith",
  "SharedWithName",
  "Permission",
  "SharedBy",
  "SharedByName",
  "ShareToken",
  "CreatedAt",
  "ExpiresAt",
];

// Helper: convert object to row array
function accessToRow(a) {
  return [
    a.id || "",
    a.projectId || "",
    a.sharedWith || "",
    a.sharedWithName || "",
    a.permission || PERMISSIONS.VIEWER,
    a.sharedBy || "",
    a.sharedByName || "",
    a.shareToken || "",
    a.createdAt || new Date().toISOString(),
    a.expiresAt || "",
  ];
}

// Helper: convert row array to object
function rowToAccess(row) {
  return {
    id: row[0] || "",
    projectId: row[1] || "",
    sharedWith: row[2] || "",
    sharedWithName: row[3] || "",
    permission: row[4] || PERMISSIONS.VIEWER,
    sharedBy: row[5] || "",
    sharedByName: row[6] || "",
    shareToken: row[7] || "",
    createdAt: row[8] || "",
    expiresAt: row[9] || "",
  };
}

/**
 * Share project with a user by email
 * POST /api/access/share
 */
export const shareProject = async (req, res) => {
  try {
    const { projectId, sharedWith, sharedWithName, permission, sharedBy, sharedByName } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }
    if (!sharedWith && !sharedBy) {
      return res.status(400).json({ error: "Either sharedWith email or sharedBy email is required" });
    }

    // Verify project exists
    const { rows: projectRows } = await readSheetValues("Projects");
    const project = projectRows.find((r) => r[0] === projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const projectName = project[1] || "Unknown Project";

    // Check if already shared with this user
    const { rows: accessRows } = await readSheetValues(SHEET_NAME);
    const existingShare = accessRows.find(
      (r) => r[1] === projectId && r[2] === sharedWith
    );

    if (existingShare) {
      // Update existing share
      const index = accessRows.findIndex((r) => r[1] === projectId && r[2] === sharedWith);
      const existing = rowToAccess(accessRows[index]);
      
      const updated = {
        ...existing,
        permission: permission || existing.permission,
        sharedWithName: sharedWithName || existing.sharedWithName,
      };

      const rowNumber = 1 + index + 1;
      await updateRow(SHEET_NAME, rowNumber, accessToRow(updated));

      // Send notification email
      try {
        const frontendUrl = getFrontendUrl(req);
        const projectLink = `${frontendUrl}/projects?shared=true&email=${encodeURIComponent(sharedWith)}`;
        
        const emailSubject = `📁 Project Shared: ${projectName}`;
        const emailBody = `Hello ${sharedWithName || sharedWith},

${sharedByName || sharedBy} has ${existing ? "updated your access to" : "shared"} a project with you:

Project: ${projectName}
Permission: ${updated.permission === PERMISSIONS.EDITOR ? "Editor (can edit)" : "Viewer (view only)"}

Click the link below to access the project:
${projectLink}

Or visit your dashboard and check the "Shared with Me" section.

Best regards,
Project Management System`;

        // HTML version with clickable link
        const emailBodyHTML = `Hello ${sharedWithName || sharedWith},<br><br>
${sharedByName || sharedBy} has ${existing ? "updated your access to" : "shared"} a project with you:<br><br>
<strong>Project:</strong> ${projectName}<br>
<strong>Permission:</strong> ${updated.permission === PERMISSIONS.EDITOR ? "Editor (can edit)" : "Viewer (view only)"}<br><br>
<a href="${projectLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">View Project</a><br><br>
Or visit your dashboard and check the "Shared with Me" section.<br><br>
Best regards,<br>
Project Management System`;

        await sendEmail(sharedWith, emailSubject, emailBodyHTML);
        console.log(`✅ Share notification email sent to ${sharedWith}`);
      } catch (emailError) {
        console.error("❌ Error sending share email:", emailError.message);
      }

      return res.status(200).json({
        message: "✅ Project access updated",
        access: updated,
      });
    }

    // Create new share
    const shareData = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      sharedWith,
      sharedWithName: sharedWithName || "",
      permission: permission || PERMISSIONS.VIEWER,
      sharedBy: sharedBy || "",
      sharedByName: sharedByName || "",
      shareToken: generateShareToken(),
      createdAt: new Date().toISOString(),
      expiresAt: "",
    };

    validateAccess(shareData);
    await appendRow(SHEET_NAME, accessToRow(shareData));

    // Send notification email
    try {
      const frontendUrl = getFrontendUrl(req);
      const projectLink = `${frontendUrl}/projects?shared=true&email=${encodeURIComponent(sharedWith)}`;
      
      const emailSubject = `📁 Project Shared: ${projectName}`;
      const emailBody = `Hello ${sharedWithName || sharedWith},

${sharedByName || sharedBy} has shared a project with you:

Project: ${projectName}
Permission: ${shareData.permission === PERMISSIONS.EDITOR ? "Editor (can edit)" : "Viewer (view only)"}

Click the link below to access the project:
${projectLink}

Or visit your dashboard and check the "Shared with Me" section.

Best regards,
Project Management System`;

      // HTML version with clickable link
      const emailBodyHTML = `Hello ${sharedWithName || sharedWith},<br><br>
${sharedByName || sharedBy} has shared a project with you:<br><br>
<strong>Project:</strong> ${projectName}<br>
<strong>Permission:</strong> ${shareData.permission === PERMISSIONS.EDITOR ? "Editor (can edit)" : "Viewer (view only)"}<br><br>
<a href="${projectLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">View Project</a><br><br>
Or visit your dashboard and check the "Shared with Me" section.<br><br>
Best regards,<br>
Project Management System`;

      await sendEmail(sharedWith, emailSubject, emailBodyHTML);
      console.log(`✅ Share notification email sent to ${sharedWith}`);
    } catch (emailError) {
      console.error("❌ Error sending share email:", emailError.message);
    }

    return res.status(201).json({
      message: "✅ Project shared successfully",
      access: shareData,
    });
  } catch (err) {
    console.error("shareProject error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Get frontend URL for share links
 * Priority: FRONTEND_URL env var > Request origin > Deployed URL > localhost
 */
const getFrontendUrl = (req) => {
  // Priority 1: Use environment variable (explicitly set)
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  
  // Priority 2: Try to get from request origin (for same-domain deployments)
  if (req && req.headers && req.headers.origin) {
    const origin = req.headers.origin;
    // If origin is from Render, use it
    if (origin.includes('onrender.com') || origin.includes('vercel.app') || origin.includes('netlify.app')) {
      console.log(`🔗 Using frontend URL from request origin: ${origin}`);
      return origin;
    }
  }
  
  // Priority 3: Use deployed frontend URL (if known)
  // Update this if your frontend is deployed to a different URL
  const deployedFrontendUrl = "https://project-management-dashboard-frontend-2.onrender.com";
  if (process.env.NODE_ENV === 'production') {
    console.log(`🔗 Using deployed frontend URL: ${deployedFrontendUrl}`);
    return deployedFrontendUrl;
  }
  
  // Priority 4: Development fallback
  return "http://localhost:5173";
};

/**
 * Generate shareable link for a project
 * POST /api/access/generate-link
 */
export const generateShareLink = async (req, res) => {
  try {
    const { projectId, permission, expiresAt, sharedBy, sharedByName } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // Verify project exists
    const { rows: projectRows } = await readSheetValues("Projects");
    const project = projectRows.find((r) => r[0] === projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const shareToken = generateShareToken();
    const shareData = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      sharedWith: "", // Empty for link-based sharing
      sharedWithName: "",
      permission: permission || PERMISSIONS.VIEWER,
      sharedBy: sharedBy || "",
      sharedByName: sharedByName || "",
      shareToken,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || "",
    };

    await appendRow(SHEET_NAME, accessToRow(shareData));

    // Generate shareable link (frontend URL + token)
    const frontendUrl = getFrontendUrl(req);
    const shareLink = `${frontendUrl}/projects/shared/${shareToken}`;
    
    console.log(`🔗 Generated share link: ${shareLink}`);
    console.log(`   Frontend URL: ${frontendUrl}`);
    console.log(`   Share token: ${shareToken}`);

    return res.status(201).json({
      message: "✅ Shareable link generated",
      shareLink,
      shareToken,
      expiresAt: shareData.expiresAt,
    });
  } catch (err) {
    console.error("generateShareLink error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Get all shares for a project
 * GET /api/access/project/:projectId
 */
export const getProjectShares = async (req, res) => {
  try {
    const { projectId } = req.params;

    const { rows } = await readSheetValues(SHEET_NAME);
    if (!rows || rows.length === 0) return res.status(200).json([]);

    const shares = rows
      .filter((r) => r[1] === projectId) // Filter by projectId
      .map((r) => rowToAccess(r));

    return res.status(200).json(shares);
  } catch (err) {
    console.error("getProjectShares error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Get all projects shared with a user
 * GET /api/access/user/:email
 */
export const getUserSharedProjects = async (req, res) => {
  try {
    const { email } = req.params;

    const { rows: accessRows } = await readSheetValues(SHEET_NAME);
    const { rows: projectRows } = await readSheetValues("Projects");

    if (!accessRows || accessRows.length === 0) return res.status(200).json([]);

    // Find all shares for this user (by email)
    // Note: Link-based shares are accessed via token, not by user email
    const userShares = accessRows.filter(
      (r) => r[2] === email && r[2] !== "" // sharedWith matches email and is not empty (not link-based)
    );

    // Get project details for each share
    const sharedProjects = userShares
      .map((shareRow) => {
        const access = rowToAccess(shareRow);
        const projectRow = projectRows.find((r) => r[0] === access.projectId);
        if (!projectRow) return null;

        const project = {
          id: projectRow[0],
          name: projectRow[1],
          owner: projectRow[2],
          description: projectRow[3],
          startDate: projectRow[4],
          endDate: projectRow[5],
          status: projectRow[6],
          progress: Number(projectRow[7]) || 0,
        };

        return {
          ...project,
          permission: access.permission,
          sharedBy: access.sharedBy,
          sharedByName: access.sharedByName,
          shareToken: access.shareToken,
        };
      })
      .filter((p) => p !== null);

    return res.status(200).json(sharedProjects);
  } catch (err) {
    console.error("getUserSharedProjects error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Update share permission
 * PUT /api/access/:id
 */
export const updateShare = async (req, res) => {
  try {
    const { id } = req.params;
    const { permission, expiresAt } = req.body;

    const { rows } = await readSheetValues(SHEET_NAME);
    const index = rows.findIndex((r) => r[0] === id);

    if (index === -1) {
      return res.status(404).json({ error: "Share not found" });
    }

    const existing = rowToAccess(rows[index]);
    const updated = {
      ...existing,
      permission: permission !== undefined ? permission : existing.permission,
      expiresAt: expiresAt !== undefined ? expiresAt : existing.expiresAt,
    };

    const rowNumber = 1 + index + 1;
    await updateRow(SHEET_NAME, rowNumber, accessToRow(updated));

    return res.status(200).json({
      message: "✅ Share updated successfully",
      access: updated,
    });
  } catch (err) {
    console.error("updateShare error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Remove share (revoke access)
 * DELETE /api/access/:id
 */
export const removeShare = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Share ID is required" });
    }

    const { rows } = await readSheetValues(SHEET_NAME);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No shares found" });
    }

    const index = rows.findIndex((r) => r[0] === id);
    if (index === -1) {
      return res.status(404).json({ error: `Share with ID ${id} not found` });
    }

    await deleteRowByIndex(SHEET_NAME, index);

    return res.status(200).json({ message: "✅ Share removed successfully" });
  } catch (err) {
    console.error("removeShare error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Get project by share token (for link-based access)
 * GET /api/access/token/:token
 */
export const getProjectByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const { rows: accessRows } = await readSheetValues(SHEET_NAME);
    const { rows: projectRows } = await readSheetValues("Projects");

    const share = accessRows.find((r) => r[7] === token); // shareToken is at index 7
    if (!share) {
      return res.status(404).json({ error: "Invalid or expired share link" });
    }

    const access = rowToAccess(share);

    // Check expiration
    if (access.expiresAt && new Date(access.expiresAt) < new Date()) {
      return res.status(410).json({ error: "Share link has expired" });
    }

    const projectRow = projectRows.find((r) => r[0] === access.projectId);
    if (!projectRow) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = {
      id: projectRow[0],
      name: projectRow[1],
      owner: projectRow[2],
      description: projectRow[3],
      startDate: projectRow[4],
      endDate: projectRow[5],
      status: projectRow[6],
      progress: Number(projectRow[7]) || 0,
      permission: access.permission,
    };

    return res.status(200).json(project);
  } catch (err) {
    console.error("getProjectByToken error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

