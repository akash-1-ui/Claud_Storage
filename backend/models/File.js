const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  userId: String,
  fileName: String,
  fileURL: String,
  fileSize: Number,
  cloudinaryPublicId: String,
  permission: {
    type: String,
    default: "private"
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("File", fileSchema);
