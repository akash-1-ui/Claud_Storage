const path = require("path");
const mongoose = require(require.resolve("mongoose", { paths: [path.join(__dirname, "..")] }));

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    profilePhoto: {
      type: String,
      default: ""
    },
    clusterName: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    cloudName: {
      type: String,
      required: true,
      trim: true
    },
    storageUsedMB: {
      type: Number,
      default: 0,
      min: 0
    },
    // Keep bytes as the source of truth for strict quota checks.
    storageUsed: {
      type: Number,
      default: 0,
      min: 0
    },
    storageLimitMB: {
      type: Number,
      default: 1024
    },
    storageLimit: {
      type: Number,
      default: 1073741824 // 1024MB in bytes
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.model("User", userSchema);
