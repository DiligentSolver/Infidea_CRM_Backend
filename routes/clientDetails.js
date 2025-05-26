const express = require("express");
const router = express.Router();
const {
  createClient,
  getAllClients,
  getClientById,
} = require("../controllers/clientDetailsController");

// Create a new client
router.post("/", createClient);

// Get all clients
router.get("/", getAllClients);

// Get a specific client by ID
router.get("/:id", getClientById);

module.exports = router;
