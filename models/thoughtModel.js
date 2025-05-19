const mongoose = require("mongoose");

const thoughtSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["motivation", "leadership", "success", "teamwork", "other"],
      default: "motivation",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for random sampling and active thoughts
thoughtSchema.index({ isActive: 1 });

const Thought = mongoose.model("Thought", thoughtSchema);

module.exports = Thought;
