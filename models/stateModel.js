const mongoose = require("mongoose");

const stateSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true }, // Example: "MH" for Maharashtra
  name: { type: String, required: true }, // Example: "Maharashtra"
});

module.exports = mongoose.model("State", stateSchema);
