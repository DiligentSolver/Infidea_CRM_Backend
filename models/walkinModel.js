const mongoose = require("mongoose");

const WalkinSchema = new mongoose.Schema(
  {
    candidateName: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    walkinDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "Walkin at Infidea",
    },
    remarks: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true }
);

const Walkin = mongoose.model("Walkin", WalkinSchema);
module.exports = Walkin;
