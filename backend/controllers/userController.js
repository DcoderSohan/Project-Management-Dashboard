// backend/controllers/userController.js
import {
  readSheetValues,
  appendRow,
  updateRow,
  deleteRowByIndex,
} from "../services/googleSheetService.js";
import { validateUser } from "../models/userModel.js";

/**
 * Assumptions:
 * - Your Google Sheet has a tab named "Users"
 * - Row 1 is header, e.g. columns:
 *   ID | Name | Email | Role | Department | JoinedAt
 */

const SHEET_NAME = "Users";
const HEADER_COLUMNS = [
  "ID",
  "Name",
  "Email",
  "Role",
  "Department",
  "JoinedAt",
];

// helper: convert object into row array
function userToRow(u) {
  return [
    u.id || "",
    u.name || "",
    u.email || "",
    u.role || "Employee",
    u.department || "General",
    u.joinedAt || new Date().toISOString(),
  ];
}

// helper: convert row array to object using header columns
function rowToUser(row) {
  return {
    id: row[0] || "",
    name: row[1] || "",
    email: row[2] || "",
    role: row[3] || "Employee",
    department: row[4] || "General",
    joinedAt: row[5] || "",
  };
}

// ✅ CREATE USER
export const createUser = async (req, res) => {
  try {
    const data = req.body;

    if (!data.name || !data.email)
      return res.status(400).json({ error: "Name and email are required" });

    validateUser(data);

    // Generate unique ID: timestamp + random component
    data.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    data.joinedAt = new Date().toISOString();

    const row = userToRow(data);
    await appendRow(SHEET_NAME, row);

    return res
      .status(201)
      .json({ message: "✅ User added successfully!", user: data });
  } catch (error) {
    console.error("❌ Error adding user:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// ✅ GET ALL USERS
export const getAllUsers = async (req, res) => {
  try {
    const { rows } = await readSheetValues(SHEET_NAME);
    if (!rows || rows.length === 0) return res.status(200).json([]);

    const users = rows.map((r) => rowToUser(r));
    return res.status(200).json(users);
  } catch (error) {
    console.error("❌ Error fetching users:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// ✅ UPDATE USER
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const { rows } = await readSheetValues(SHEET_NAME);
    const index = (rows || []).findIndex((r) => r[0] === id);

    if (index === -1)
      return res.status(404).json({ error: "User not found" });

    const existing = rowToUser(rows[index]);
    // merge updates
    const merged = {
      id: existing.id,
      name: update.name ?? existing.name,
      email: update.email ?? existing.email,
      role: update.role ?? existing.role,
      department: update.department ?? existing.department,
      joinedAt: existing.joinedAt, // don't update joinedAt
    };

    // compute row number = header(1) + index + 1
    const rowNumber = 1 + index + 1;
    await updateRow(SHEET_NAME, rowNumber, userToRow(merged));

    return res
      .status(200)
      .json({ message: "✅ User updated successfully!", user: merged });
  } catch (error) {
    console.error("❌ Error updating user:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// ✅ DELETE USER
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const { rows } = await readSheetValues(SHEET_NAME);
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No users found" });
    }

    const index = (rows || []).findIndex((r) => r[0] === id);

    if (index === -1) {
      return res.status(404).json({ error: `User with ID ${id} not found` });
    }

    console.log(`Deleting user at index ${index} (ID: ${id})`);

    await deleteRowByIndex(SHEET_NAME, index);

    console.log(`User deleted successfully (ID: ${id})`);

    return res.status(200).json({ message: "🗑️ User deleted successfully!" });
  } catch (error) {
    console.error("❌ Error deleting user:", error.message);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ error: "Failed to delete user", message: error.message });
  }
};
