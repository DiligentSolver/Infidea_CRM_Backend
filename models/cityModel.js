const mongoose = require("mongoose");

const citySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // City name
  stateCode: { type: String, required: true }, // Code of the state (Example: "MH" for Maharashtra)
});

module.exports = mongoose.model("City", citySchema);
