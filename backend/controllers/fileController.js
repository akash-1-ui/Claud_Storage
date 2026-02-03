const bucket = require("../config/firebase");
const File = require("../models/File");
const User = require("../models/userModel");

exports.uploadFile = async (req, res) => {
  const file = req.file;

  const blob = bucket.file(Date.now() + "_" + file.originalname);
  const blobStream = blob.createWriteStream();

  blobStream.on("finish", async () => {
    const fileURL = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

    const fileSize = file.size;

    await new File({
      userId: req.userId,
      fileName: file.originalname,
      fileURL,
      fileSize
    }).save();

    // Update user's storage used
    await User.findByIdAndUpdate(req.userId, { $inc: { storageUsed: fileSize } });

    res.json({ message: "File uploaded successfully", fileURL });
  });

  blobStream.end(file.buffer);
};

exports.getFiles = async (req, res) => {
  try {
    const files = await File.find({ userId: req.userId });
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: "Error fetching files" });
  }
};
