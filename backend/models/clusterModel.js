const mongoose = require("mongoose");

const clusterSchema = new mongoose.Schema(
  {
    clusterName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    cloudName: {
      type: String,
      required: true,
      trim: true
    },
    apiKey: {
      type: String,
      required: true,
      trim: true
    },
    apiSecret: {
      type: String,
      required: true,
      trim: true
    },
    maxUsers: {
      type: Number,
      required: true,
      min: 1
    },
    currentUsers: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

clusterSchema.index({ currentUsers: 1, maxUsers: 1 });

module.exports = mongoose.model("Cluster", clusterSchema);
