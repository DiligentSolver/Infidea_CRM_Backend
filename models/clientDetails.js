const mongoose = require("mongoose");

const clientDetailsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    number: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      required: false,
      trim: true,
    },
    companyName: {
      type: String,
      required: false,
      trim: true,
    },
    clientRemarks: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent updates to the document
clientDetailsSchema.pre("save", function (next) {
  if (!this.isNew) {
    const err = new Error("Client details cannot be modified once created");
    return next(err);
  }
  next();
});

const ClientDetails = mongoose.model("ClientDetails", clientDetailsSchema);

module.exports = ClientDetails;
