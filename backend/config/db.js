const path = require("path");
const mongoose = require(require.resolve("mongoose", { paths: [path.join(__dirname, "..")] }));

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("Missing MONGO_URI environment variable.");
    process.exit(1);
  }

  try {
    const mongoHost = uri.includes("@")
      ? uri.split("@")[1].split("/")[0]
      : uri.split("/")[2] || uri;

    console.log("Connecting to MongoDB host:", mongoHost);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
