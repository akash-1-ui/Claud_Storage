const bucket = require("../config/firebase");
const File = require("../models/File");

exports.uploadFile = async (req, res) => {
  const file = req.file;

  const blob = bucket.file(Date.now() + "_" + file.originalname);
  const blobStream = blob.createWriteStream();

  blobStream.on("finish", async () => {
    const fileURL = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

    await new File({
      userId: req.userId,
      fileName: file.originalname,
      fileURL
    }).save();

    res.json({ message: "File uploaded successfully", fileURL });
  });

  blobStream.end(file.buffer);
};
