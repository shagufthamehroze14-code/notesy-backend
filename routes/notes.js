const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Note = require("../models/Note");
const { protect, authorize } = require("../middleware/auth");

// Create uploads directory if it doesn't exist
const uploadsDir = "./uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// @route   POST /api/notes/upload
// @desc    Upload a new note (Admin only)
// @access  Private/Admin
router.post(
  "/upload",
  protect,
  authorize("admin"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload a PDF file",
        });
      }

      const { title, subject, semester, unit, description } = req.body;

      const note = await Note.create({
        title,
        subject,
        semester,
        unit,
        description,
        filename: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        uploadedBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        message: "Note uploaded successfully",
        note,
      });
    } catch (error) {
      // Delete uploaded file if database save fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: "Error uploading note",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/notes
// @desc    Get all notes with filters
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { subject, semester, search } = req.query;

    let query = {};

    if (subject) {
      query.subject = subject;
    }

    if (semester) {
      query.semester = parseInt(semester);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const notes = await Note.find(query)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching notes",
      error: error.message,
    });
  }
});

// @route   GET /api/notes/:id
// @desc    Get single note by ID
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate(
      "uploadedBy",
      "name email"
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    res.status(200).json({
      success: true,
      note,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching note",
      error: error.message,
    });
  }
});

// @route   GET /api/notes/download/:id
// @desc    Download a note
// @access  Private
router.get("/download/:id", protect, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Increment download count
    note.downloads += 1;
    await note.save();

    // Send file
    res.download(note.filePath, note.filename);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error downloading note",
      error: error.message,
    });
  }
});

// @route   PUT /api/notes/:id
// @desc    Update a note (Admin only)
// @access  Private/Admin
router.put("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const { title, subject, semester, unit, description } = req.body;

    let note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    note = await Note.findByIdAndUpdate(
      req.params.id,
      { title, subject, semester, unit, description },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Note updated successfully",
      note,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating note",
      error: error.message,
    });
  }
});

// @route   DELETE /api/notes/:id
// @desc    Delete a note (Admin only)
// @access  Private/Admin
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Delete file from filesystem
    if (fs.existsSync(note.filePath)) {
      fs.unlinkSync(note.filePath);
    }

    await note.deleteOne();

    res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting note",
      error: error.message,
    });
  }
});

// @route   GET /api/notes/subjects/list
// @desc    Get list of all subjects
// @access  Private
router.get("/subjects/list", protect, async (req, res) => {
  try {
    const subjects = await Note.distinct("subject");

    res.status(200).json({
      success: true,
      subjects,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching subjects",
      error: error.message,
    });
  }
});

module.exports = router;
