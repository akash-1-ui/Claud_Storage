const supabase = require("../config/supabase");
const File = require("../models/File");
const User = require("../models/userModel");

exports.uploadFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const fileName = Date.now() + "_" + file.originalname;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('cloud-storage')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error || !data || !data.path) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({ message: "Error uploading file to storage", error });
    }

    // Ensure the bucket is public and generate a direct public URL
    const publicURL = `${process.env.SUPABASE_URL}/storage/v1/object/public/cloud-storage/${data.path}`;

    const fileSize = file.size;

    await new File({
      userId: req.userId,
      fileName: file.originalname,
      fileURL: publicURL,
      fileSize
    }).save();

    // Update user's storage used
    await User.findByIdAndUpdate(req.userId, { $inc: { storageUsed: fileSize } });

    res.json({ message: "File uploaded successfully", fileURL: publicURL });
  } catch (err) {
    console.error("UploadFile error:", err);
    res.status(500).json({ message: "Error uploading file", error: err.message });
  }
};

exports.getFiles = async (req, res) => {
  try {
    // Return only files for the current user
    const files = await File.find({ userId: req.userId });
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: "Error fetching files" });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.userId });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Extract file path from URL
    const urlParts = file.fileURL.split('/storage/v1/object/public/cloud-storage/');
    const filePath = urlParts[1];

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from('cloud-storage')
      .remove([filePath]);

    if (error) {
      return res.status(500).json({ message: "Error deleting file from storage", error });
    }

    // Delete from MongoDB
    await File.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    // Update user's storage used
    await User.findByIdAndUpdate(req.userId, { $inc: { storageUsed: -file.fileSize } });

    res.json({ message: "File deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting file", error: err.message });
  }
};

exports.renameFile = async (req, res) => {
  try {
    const { newName } = req.body;
    const file = await File.findOne({ _id: req.params.id, userId: req.userId });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    // Update in MongoDB
    await File.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { fileName: newName });
    res.json({ message: "File renamed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error renaming file" });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.userId });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Redirect to Supabase Storage URL
    res.redirect(file.fileURL);
  } catch (err) {
    res.status(500).json({ message: "Error downloading file" });
  }
};

exports.checkStorage = async (req, res) => {
  try {
    // Get user's files and calculate storage used
    const userFiles = await File.find({ userId: req.userId });
    const storageUsed = userFiles.reduce((total, file) => total + (file.fileSize || 0), 0);
    
    res.json({ 
      message: "Storage check successful", 
      fileCount: userFiles.length,
      storageUsed: storageUsed,
      storageUsedGB: (storageUsed / (1024 * 1024 * 1024)).toFixed(2),
      files: userFiles 
    });
  } catch (err) {
    res.status(500).json({ message: "Error checking storage", error: err.message });
  }
};
