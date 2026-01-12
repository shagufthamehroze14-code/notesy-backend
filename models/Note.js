const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
  },
  subject: {
    type: String,
    required: [true, "Subject is required"],
    trim: true,
  },
  semester: {
    type: Number,
    required: [true, "Semester is required"],
    min: 1,
    max: 8,
  },
  unit: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  filename: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  downloads: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
noteSchema.index({ subject: 1, semester: 1 });
noteSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model("Note", noteSchema);
