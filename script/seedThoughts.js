const mongoose = require("mongoose");
require("dotenv").config();
const Thought = require("../models/thoughtModel");

// Connect to MongoDB
const connectDB = require("../config/db");
connectDB();

// Sample thoughts for employees
const thoughtsData = [
  {
    content:
      "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle.",
    author: "Steve Jobs",
    category: "motivation",
    isActive: true,
  },
  {
    content:
      "Your time is limited, so don't waste it living someone else's life.",
    author: "Steve Jobs",
    category: "motivation",
    isActive: true,
  },
  {
    content: "Leadership is the capacity to translate vision into reality.",
    author: "Warren Bennis",
    category: "leadership",
    isActive: true,
  },
  {
    content:
      "The greatest leader is not necessarily the one who does the greatest things. He is the one that gets people to do the greatest things.",
    author: "Ronald Reagan",
    category: "leadership",
    isActive: true,
  },
  {
    content:
      "Success is not final, failure is not fatal: It is the courage to continue that counts.",
    author: "Winston Churchill",
    category: "success",
    isActive: true,
  },
  {
    content:
      "Success usually comes to those who are too busy to be looking for it.",
    author: "Henry David Thoreau",
    category: "success",
    isActive: true,
  },
  {
    content:
      "Talent wins games, but teamwork and intelligence win championships.",
    author: "Michael Jordan",
    category: "teamwork",
    isActive: true,
  },
  {
    content: "Alone we can do so little; together we can do so much.",
    author: "Helen Keller",
    category: "teamwork",
    isActive: true,
  },
  {
    content:
      "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
    category: "motivation",
    isActive: true,
  },
  {
    content: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
    category: "motivation",
    isActive: true,
  },
  {
    content:
      "The only limit to our realization of tomorrow is our doubts of today.",
    author: "Franklin D. Roosevelt",
    category: "motivation",
    isActive: true,
  },
  {
    content: "The best way to predict the future is to create it.",
    author: "Peter Drucker",
    category: "success",
    isActive: true,
  },
  {
    content: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs",
    category: "leadership",
    isActive: true,
  },
  {
    content:
      "Coming together is a beginning, staying together is progress, and working together is success.",
    author: "Henry Ford",
    category: "teamwork",
    isActive: true,
  },
  {
    content:
      "The secret of change is to focus all of your energy, not on fighting the old, but on building the new.",
    author: "Socrates",
    category: "success",
    isActive: true,
  },
];

const seedDB = async () => {
  try {
    // Get any employee to set as creator
    const Employee = require("../models/employeeModel");
    const employee = await Employee.findOne();

    if (!employee) {
      console.log(
        "No employee found in the database. Creating a temporary ID."
      );
      // Create a temporary ObjectId if no employee exists
      const tempId = new mongoose.Types.ObjectId();
      await seedThoughts(tempId);
    } else {
      console.log(`Using employee with ID: ${employee._id} as creator`);
      await seedThoughts(employee._id);
    }
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

const seedThoughts = async (creatorId) => {
  try {
    // Delete existing thoughts
    await Thought.deleteMany({});
    console.log("Deleted existing thoughts");

    // Add creator ID to each thought
    const thoughtsWithCreator = thoughtsData.map((thought) => ({
      ...thought,
      createdBy: creatorId,
    }));

    // Insert new thoughts
    await Thought.insertMany(thoughtsWithCreator);
    console.log(`Successfully seeded ${thoughtsWithCreator.length} thoughts!`);

    process.exit(0);
  } catch (error) {
    console.error("Error inserting thoughts:", error);
    process.exit(1);
  }
};

seedDB();
