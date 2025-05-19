const Thought = require("../models/thoughtModel");
const Employee = require("../models/employeeModel");

// Get 5 random thoughts for daily display on dashboard
exports.getRandomThoughts = async (req, res) => {
  try {
    // Get 5 random active thoughts
    const randomThoughts = await Thought.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: 5 } },
    ]);

    res.status(200).json({
      success: true,
      data: randomThoughts,
      count: randomThoughts.length,
    });
  } catch (error) {
    console.error("Error fetching random thoughts:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get all thoughts (for admin)
exports.getAllThoughts = async (req, res) => {
  try {
    const thoughts = await Thought.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: thoughts,
      count: thoughts.length,
    });
  } catch (error) {
    console.error("Error fetching thoughts:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Create a new thought (admin only)
exports.createThought = async (req, res) => {
  try {
    const { content, author, category } = req.body;

    if (!content || !author) {
      return res.status(400).json({
        success: false,
        message: "Content and author are required fields",
      });
    }

    const thought = await Thought.create({
      content,
      author,
      category: category || "motivation",
      createdBy: req.employee._id,
    });

    res.status(201).json({
      success: true,
      data: thought,
      message: "Thought created successfully",
    });
  } catch (error) {
    console.error("Error creating thought:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get a specific thought by ID
exports.getThoughtById = async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);

    if (!thought) {
      return res.status(404).json({
        success: false,
        message: "Thought not found",
      });
    }

    res.status(200).json({
      success: true,
      data: thought,
    });
  } catch (error) {
    console.error("Error fetching thought:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update a thought (admin only)
exports.updateThought = async (req, res) => {
  try {
    const { content, author, category, isActive } = req.body;
    const thoughtId = req.params.id;

    const thought = await Thought.findById(thoughtId);

    if (!thought) {
      return res.status(404).json({
        success: false,
        message: "Thought not found",
      });
    }

    const updatedThought = await Thought.findByIdAndUpdate(
      thoughtId,
      {
        content: content || thought.content,
        author: author || thought.author,
        category: category || thought.category,
        isActive: isActive !== undefined ? isActive : thought.isActive,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedThought,
      message: "Thought updated successfully",
    });
  } catch (error) {
    console.error("Error updating thought:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete a thought (admin only)
exports.deleteThought = async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);

    if (!thought) {
      return res.status(404).json({
        success: false,
        message: "Thought not found",
      });
    }

    await Thought.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Thought deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting thought:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
