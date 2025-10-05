const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      process.env.DATABASE_URL;

    if (!mongoUri || typeof mongoUri !== "string") {
      throw new Error(
        "Missing MongoDB connection string. Please set MONGODB_URI (preferred) or MONGO_URI or DATABASE_URL."
      );
    }

    await mongoose.connect(mongoUri, {});
    console.log("MongoDB Connected...");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
