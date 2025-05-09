const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    mongoose.connect(
      process.env.MONGO_URI ||
        "mongodb+srv://flutterbackendinfi:**flutter%40backend%2B%2B@flutter-backend.ogjjj.mongodb.net/Infidea_CRM?retryWrites=true&w=majority",
      {}
    );
    console.log("MongoDB Connected...");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
