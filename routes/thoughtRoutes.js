const express = require("express");
const router = express.Router();
const thoughtController = require("../controllers/thoughtController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

// Employee access - Get random thoughts for dashboard
router.get("/random", authMiddleware, thoughtController.getRandomThoughts);

// Admin access - CRUD operations
// Get all thoughts
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  thoughtController.getAllThoughts
);

// Create new thought
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  thoughtController.createThought
);

// Get thought by ID
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  thoughtController.getThoughtById
);

// Update thought
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  thoughtController.updateThought
);

// Delete thought
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  thoughtController.deleteThought
);

module.exports = router;
