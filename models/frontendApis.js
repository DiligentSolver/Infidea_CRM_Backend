const mongoose = require("mongoose");

const commonSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

// Models for different collections
const CorporateCity = mongoose.model("CorporateCity", commonSchema);
const IndoreLocality = mongoose.model("IndoreLocality", commonSchema);
const Diploma = mongoose.model("Diploma", commonSchema);
const GraduateDegree = mongoose.model("GraduateDegree", commonSchema);
const MasterDegree = mongoose.model("MasterDegree", commonSchema);
const SpeakingLanguage = mongoose.model("SpeakingLanguage", commonSchema);
const JobRole = mongoose.model("JobRole", commonSchema);

module.exports = {
  CorporateCity,
  IndoreLocality,
  Diploma,
  GraduateDegree,
  MasterDegree,
  SpeakingLanguage,
  JobRole,
};
