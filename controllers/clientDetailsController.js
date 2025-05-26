const ClientDetails = require("../models/clientDetails");

// Create a new client
const createClient = async (req, res) => {
  try {
    const clientDetails = new ClientDetails(req.body);
    await clientDetails.save();
    res.status(201).send(clientDetails);
  } catch (error) {
    res.status(400).send({
      message: error.message || "Error creating client details",
    });
  }
};

// Get all clients
const getAllClients = async (req, res) => {
  try {
    const clients = await ClientDetails.find({});
    res.send(clients);
  } catch (error) {
    res.status(500).send({
      message: error.message || "Error retrieving client details",
    });
  }
};

// Get a specific client by ID
const getClientById = async (req, res) => {
  try {
    const client = await ClientDetails.findById(req.params.id);
    if (!client) {
      return res.status(404).send({ message: "Client not found" });
    }
    res.send(client);
  } catch (error) {
    res.status(500).send({
      message: error.message || "Error retrieving client details",
    });
  }
};

module.exports = {
  createClient,
  getAllClients,
  getClientById,
};
