const path = require("path");
const mongoose = require(require.resolve("mongoose", { paths: [path.join(__dirname, "..")] }));

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI); // NO options needed
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
