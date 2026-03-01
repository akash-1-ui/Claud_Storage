const path = require("path");
const mongoose = require(require.resolve("mongoose", { paths: [path.join(__dirname, "..")] }));

const fileSchema = new mongoose.Schema({
  userId: String,
  fileName: String,
  fileURL: String,
  fileSize: Number,
  cloudinaryPublicId: String,
  isFavorite: {
    type: Boolean,
    default: false
  },
  isTrashed: {
    type: Boolean,
    default: false,
    index: true
  },
  trashedAt: {
    type: Date,
    default: null,
    index: true
  },
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
