const Note = require("../models/noteModel");
const asyncHandler = require("express-async-handler");

/**
 * @desc    Create a new note
 * @route   POST /crm/api/notes
 * @access  Private (Employee)
 */
const createNote = asyncHandler(async (req, res) => {
  const { title, content, category } = req.body;

  if (!title || !content) {
    res.status(400);
    throw new Error("Please provide title and content");
  }

  const note = await Note.create({
    title,
    content,
    category: category || "personal",
    employee: req.employee._id,
  });

  res.status(201).json({
    success: true,
    data: note,
  });
});

/**
 * @desc    Get all notes for logged in employee
 * @route   GET /crm/api/notes
 * @access  Private (Employee)
 */
const getNotes = asyncHandler(async (req, res) => {
  const { category, isArchived } = req.query;

  const filter = { employee: req.employee._id };

  // Add optional filters if provided
  if (category) filter.category = category;
  if (isArchived !== undefined) filter.isArchived = isArchived === "true";

  const notes = await Note.find(filter).sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    count: notes.length,
    data: notes,
  });
});

/**
 * @desc    Get single note by ID
 * @route   GET /crm/api/notes/:id
 * @access  Private (Employee - only their own notes)
 */
const getNoteById = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    res.status(404);
    throw new Error("Note not found");
  }

  // Check if the note belongs to the logged in employee
  if (note.employee.toString() !== req.employee._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to access this note");
  }

  res.status(200).json({
    success: true,
    data: note,
  });
});

/**
 * @desc    Update a note
 * @route   PUT /crm/api/notes/:id
 * @access  Private (Employee - only their own notes)
 */
const updateNote = asyncHandler(async (req, res) => {
  let note = await Note.findById(req.params.id);

  if (!note) {
    res.status(404);
    throw new Error("Note not found");
  }

  // Check if the note belongs to the logged in employee
  if (note.employee.toString() !== req.employee._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to update this note");
  }

  const { title, content, category, isArchived } = req.body;

  // Update only the fields that are provided
  if (title) note.title = title;
  if (content) note.content = content;
  if (category) note.category = category;
  if (isArchived !== undefined) note.isArchived = isArchived;

  await note.save();

  res.status(200).json({
    success: true,
    data: note,
  });
});

/**
 * @desc    Delete a note
 * @route   DELETE /crm/api/notes/:id
 * @access  Private (Employee - only their own notes)
 */
const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    res.status(404);
    throw new Error("Note not found");
  }

  // Check if the note belongs to the logged in employee
  if (note.employee.toString() !== req.employee._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to delete this note");
  }

  await note.deleteOne();

  res.status(200).json({
    success: true,
    message: "Note deleted successfully",
  });
});

/**
 * @desc    Archive/Unarchive a note
 * @route   PATCH /crm/api/notes/:id/archive
 * @access  Private (Employee - only their own notes)
 */
const toggleArchiveNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    res.status(404);
    throw new Error("Note not found");
  }

  // Check if the note belongs to the logged in employee
  if (note.employee.toString() !== req.employee._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to modify this note");
  }

  // Toggle the isArchived status
  note.isArchived = !note.isArchived;
  await note.save();

  res.status(200).json({
    success: true,
    data: note,
    message: note.isArchived
      ? "Note archived successfully"
      : "Note unarchived successfully",
  });
});

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  toggleArchiveNote,
};
