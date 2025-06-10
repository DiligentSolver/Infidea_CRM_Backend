const express = require("express");
const router = express.Router();
const {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  toggleArchiveNote,
} = require("../controllers/noteController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

// Middleware for all lineup routes - only accessible by employees
const employeeMiddleware = [
  authMiddleware,
  roleMiddleware(["employee", "admin"]),
];

// Apply authentication middleware to all note routes
router.use(employeeMiddleware);

// Routes for /crm/api/notes
router.route("/").get(getNotes).post(createNote);

// Routes for specific notes by ID
router.route("/:id").get(getNoteById).put(updateNote).delete(deleteNote);

// Route for archiving/unarchiving notes
router.route("/:id/archive").patch(toggleArchiveNote);

module.exports = router;
