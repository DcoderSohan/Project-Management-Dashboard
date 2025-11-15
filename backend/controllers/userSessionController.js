// backend/controllers/userSessionController.js
import {
  readSheetValues,
  appendRow,
  updateRow,
} from "../services/googleSheetService.js";

/**
 * Assumptions:
 * - Your Google Sheet has a tab named "UserSessions"
 * - Row 1 is header, e.g. columns:
 *   ID | ClerkUserId | UserName | UserEmail | LoginTime | LastActivity | IsActive
 */

const SHEET_NAME = "UserSessions";
const HEADER_COLUMNS = [
  "ID",
  "ClerkUserId",
  "UserName",
  "UserEmail",
  "LoginTime",
  "LastActivity",
  "IsActive",
];

// helper: convert object into row array
function sessionToRow(s) {
  return [
    s.id || "",
    s.clerkUserId || "",
    s.userName || "",
    s.userEmail || "",
    s.loginTime || s.timestamp || new Date().toISOString(),
    s.lastActivity || s.loginTime || s.timestamp || new Date().toISOString(),
    s.isActive !== false ? "true" : "false",
  ];
}

// helper: convert row array to object
function rowToSession(row) {
  return {
    id: row[0] || "",
    clerkUserId: row[1] || "",
    userName: row[2] || "",
    userEmail: row[3] || "",
    loginTime: row[4] || "",
    lastActivity: row[5] || "",
    isActive: row[6] === "true" || row[6] === true,
  };
}

/**
 * Track user login
 * POST /api/auth/login
 */
export const trackUserLogin = async (req, res) => {
  try {
    const { clerkUserId, userName, userEmail, timestamp } = req.body;

    if (!clerkUserId) {
      return res.status(400).json({ error: "Clerk User ID is required" });
    }

    // Check if user already has an active session
    const { rows } = await readSheetValues(SHEET_NAME);
    const existingSessionIndex = (rows || []).findIndex(
      (r) => r && r[1] === clerkUserId && (r[6] === "true" || r[6] === true)
    );

    const loginTime = timestamp || new Date().toISOString();
    const now = new Date().toISOString();

    if (existingSessionIndex !== -1) {
      // Update existing session
      const existingSession = rowToSession(rows[existingSessionIndex]);
      const updatedSession = {
        ...existingSession,
        lastActivity: now,
        isActive: true,
        userName: userName || existingSession.userName,
        userEmail: userEmail || existingSession.userEmail,
      };

      const rowNumber = 1 + existingSessionIndex + 1;
      await updateRow(SHEET_NAME, rowNumber, sessionToRow(updatedSession));

      return res.status(200).json({
        message: "✅ User session updated",
        session: updatedSession,
      });
    } else {
      // Create new session
      const sessionData = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clerkUserId,
        userName: userName || "Unknown User",
        userEmail: userEmail || "",
        loginTime,
        lastActivity: now,
        isActive: true,
      };

      const row = sessionToRow(sessionData);
      await appendRow(SHEET_NAME, row);

      return res.status(201).json({
        message: "✅ User login tracked",
        session: sessionData,
      });
    }
  } catch (error) {
    console.error("❌ Error tracking user login:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Track user logout
 * POST /api/auth/logout
 */
export const trackUserLogout = async (req, res) => {
  try {
    const { userId, clerkUserId } = req.body;
    const targetUserId = clerkUserId || userId;

    if (!targetUserId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const { rows } = await readSheetValues(SHEET_NAME);
    const sessionIndex = (rows || []).findIndex((r) => r && r[1] === targetUserId);

    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = rowToSession(rows[sessionIndex]);
    const updatedSession = {
      ...session,
      isActive: false,
      lastActivity: new Date().toISOString(),
    };

    const rowNumber = 1 + sessionIndex + 1;
    await updateRow(SHEET_NAME, rowNumber, sessionToRow(updatedSession));

    return res.status(200).json({
      message: "✅ User logout tracked",
      session: updatedSession,
    });
  } catch (error) {
    console.error("❌ Error tracking user logout:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all logged-in users (active sessions)
 * GET /api/auth/sessions
 */
export const getLoggedInUsers = async (req, res) => {
  try {
    const { rows } = await readSheetValues(SHEET_NAME);
    if (!rows || rows.length === 0) return res.status(200).json([]);

    // Get all sessions (both active and inactive)
    const sessions = rows
      .filter((r) => r && r.length > 0) // Filter out empty rows
      .map((r) => rowToSession(r));

    // Sort by last activity (most recent first)
    sessions.sort((a, b) => {
      const dateA = new Date(a.lastActivity || a.loginTime || 0);
      const dateB = new Date(b.lastActivity || b.loginTime || 0);
      return dateB - dateA;
    });

    return res.status(200).json(sessions);
  } catch (error) {
    console.error("❌ Error fetching logged-in users:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update user activity
 * PUT /api/auth/activity
 */
export const updateUserActivity = async (req, res) => {
  try {
    const { clerkUserId } = req.body;

    if (!clerkUserId) {
      return res.status(400).json({ error: "Clerk User ID is required" });
    }

    const { rows } = await readSheetValues(SHEET_NAME);
    const sessionIndex = (rows || []).findIndex((r) => r && r[1] === clerkUserId);

    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = rowToSession(rows[sessionIndex]);
    const updatedSession = {
      ...session,
      lastActivity: new Date().toISOString(),
    };

    const rowNumber = 1 + sessionIndex + 1;
    await updateRow(SHEET_NAME, rowNumber, sessionToRow(updatedSession));

    return res.status(200).json({
      message: "✅ User activity updated",
      session: updatedSession,
    });
  } catch (error) {
    console.error("❌ Error updating user activity:", error.message);
    res.status(500).json({ error: error.message });
  }
};

