const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  storageUsed: {
    type: Number,
    default: 0
  },
  storageLimit: {
    type: Number,
    default: 5368709120 // 5 GB in bytes
  }
});

module.exports = mongoose.model("User", userSchema);
