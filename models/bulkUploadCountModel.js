const mongoose = require("mongoose");

const BulkUploadCountSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index to quickly find records by employee and date
BulkUploadCountSchema.index({ employee: 1, date: 1 }, { unique: true });

const BulkUploadCount = mongoose.model(
  "BulkUploadCount",
  BulkUploadCountSchema
);
module.exports = BulkUploadCount;
