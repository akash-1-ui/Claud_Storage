const path = require("path");
const File = require("../models/File");
const User = require("../models/userModel");
const Cluster = require("../models/clusterModel");
const {
  uploadBufferToCloudinary,
  destroyFromCloudinary
} = require("../config/cloudinary");

const ONE_MB = 1024 * 1024;
const STORAGE_LIMIT_MB = 1024;
const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_MB * ONE_MB;
const TRASH_RETENTION_MS = 24 * 60 * 60 * 1000;

const bytesToMB = (bytes) => Number((bytes / ONE_MB).toFixed(4));
const toSafeBytes = (value) => (Number.isFinite(value) && value > 0 ? value : 0);

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const syncStorageFields = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  const storageUsedBytes = Math.max(
    0,
    Number.isFinite(user.storageUsed)
      ? user.storageUsed
      : Math.round((user.storageUsedMB || 0) * ONE_MB)
  );

  const storageUsedMB = bytesToMB(storageUsedBytes);

  if (
    user.storageUsed !== storageUsedBytes ||
    user.storageUsedMB !== storageUsedMB ||
    user.storageLimit !== STORAGE_LIMIT_BYTES ||
    user.storageLimitMB !== STORAGE_LIMIT_MB
  ) {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: {
          storageUsed: storageUsedBytes,
          storageUsedMB,
          storageLimit: STORAGE_LIMIT_BYTES,
          storageLimitMB: STORAGE_LIMIT_MB
        }
      },
      { new: true }
    );
  }

  return user;
};

const getUserAndCluster = async (userId) => {
  const user = await syncStorageFields(userId);
  if (!user) {
    throw createHttpError(404, "User not found");
  }

  if (!user.clusterName || !user.cloudName) {
    throw createHttpError(400, "User is not assigned to a storage cluster");
  }

  const cluster = await Cluster.findOne({
    clusterName: user.clusterName,
    cloudName: user.cloudName
  }).lean();

  if (!cluster) {
    throw createHttpError(500, "Assigned cluster not found for user");
  }

  return { user, cluster };
};

const reserveStorage = async (userId, fileSizeBytes) =>
  User.findOneAndUpdate(
    {
      _id: userId,
      storageUsed: { $lte: STORAGE_LIMIT_BYTES - fileSizeBytes }
    },
    {
      $inc: { storageUsed: fileSizeBytes },
      $set: {
        storageLimit: STORAGE_LIMIT_BYTES,
        storageLimitMB: STORAGE_LIMIT_MB
      }
    },
    { new: true }
  );

const decrementStorage = async (userId, bytes) => {
  const user = await User.findById(userId).select("storageUsed");
  if (!user) {
    return null;
  }

  const nextBytes = Math.max(0, toSafeBytes(user.storageUsed) - toSafeBytes(bytes));

  await User.findByIdAndUpdate(userId, { $set: { storageUsed: nextBytes } });
  return syncStorageFields(userId);
};

const purgeExpiredTrashForUser = async (userId) => {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_MS);
  const expiredFiles = await File.find({
    userId,
    isTrashed: true,
    trashedAt: { $lte: cutoff }
  });

  if (expiredFiles.length === 0) {
    return 0;
  }

  let cluster = null;
  try {
    const result = await getUserAndCluster(userId);
    cluster = result.cluster;
  } catch (clusterError) {
    console.warn("trash purge cluster warning:", clusterError.message);
  }

  for (const file of expiredFiles) {
    if (!file.cloudinaryPublicId || !cluster) {
      continue;
    }

    try {
      await destroyFromCloudinary(cluster, file.cloudinaryPublicId);
    } catch (cloudinaryError) {
      console.warn("trash purge cloudinary warning:", cloudinaryError.message);
    }
  }

  const totalExpiredBytes = expiredFiles.reduce(
    (sum, file) => sum + toSafeBytes(file.fileSize),
    0
  );

  await File.deleteMany({
    _id: { $in: expiredFiles.map((file) => file._id) },
    userId
  });

  if (totalExpiredBytes > 0) {
    await decrementStorage(userId, totalExpiredBytes);
  }

  return expiredFiles.length;
};

exports.uploadFile = async (req, res) => {
  let reservedBytes = 0;
  let uploadedPublicId = null;
  let assignedCluster = null;
  let uploadFileSizeBytes = 0;

  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    uploadFileSizeBytes = toSafeBytes(file.size);
    if (uploadFileSizeBytes <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid file size"
      });
    }

    await purgeExpiredTrashForUser(req.userId);

    const { user, cluster } = await getUserAndCluster(req.userId);
    assignedCluster = cluster;

    const reservedUser = await reserveStorage(req.userId, uploadFileSizeBytes);
    if (!reservedUser) {
      return res.status(413).json({
        success: false,
        message: "Storage limit exceeded",
        storageLimitMB: STORAGE_LIMIT_MB,
        storageUsedMB: user.storageUsedMB,
        fileSizeMB: bytesToMB(uploadFileSizeBytes)
      });
    }
    reservedBytes = uploadFileSizeBytes;

    const sanitizedName =
      path
        .parse(file.originalname)
        .name.replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 80) || "file";
    const clusterFolder = String(assignedCluster.clusterName || "unassigned").replace(/[^a-zA-Z0-9_-]/g, "_");
    const uploadResult = await uploadBufferToCloudinary(assignedCluster, file.buffer, {
      folder: `clusters/${clusterFolder}/users/${req.userId}`,
      resource_type: "auto",
      public_id: `${Date.now()}_${sanitizedName}`,
      timeout: 120000
    });

    uploadedPublicId = uploadResult.public_id;

    const savedFile = await File.create({
      userId: req.userId,
      fileName: file.originalname,
      fileURL: uploadResult.secure_url,
      fileSize: uploadFileSizeBytes,
      cloudinaryPublicId: uploadResult.public_id
    });

    const updatedUser = await syncStorageFields(req.userId);

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      file: savedFile,
      storageUsedMB: updatedUser?.storageUsedMB,
      storageLimitMB: STORAGE_LIMIT_MB
    });
  } catch (error) {
    if (uploadedPublicId && assignedCluster) {
      try {
        await destroyFromCloudinary(assignedCluster, uploadedPublicId);
      } catch (destroyError) {
        console.warn("cloudinary cleanup warning:", destroyError.message);
      }
    }

    if (reservedBytes > 0) {
      await decrementStorage(req.userId, reservedBytes);
    }

    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: "Error uploading file",
      error: error.message,
      fileSizeMB: bytesToMB(uploadFileSizeBytes)
    });
  }
};

exports.saveFileMetadata = async (req, res) => {
  let reservedBytes = 0;

  try {
    const { fileName, fileURL, fileSize, cloudinaryPublicId } = req.body;

    if (!fileName || !fileURL || fileSize === undefined || fileSize === null) {
      return res.status(400).json({
        success: false,
        message: "fileName, fileURL and fileSize are required"
      });
    }

    const fileSizeBytes = Number(fileSize);
    if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
      return res.status(400).json({
        success: false,
        message: "fileSize must be a valid positive number in bytes"
      });
    }

    await purgeExpiredTrashForUser(req.userId);
    await syncStorageFields(req.userId);

    const reservedUser = await reserveStorage(req.userId, fileSizeBytes);
    if (!reservedUser) {
      return res.status(413).json({
        success: false,
        message: "Storage limit exceeded",
        storageLimitMB: STORAGE_LIMIT_MB,
        fileSizeMB: bytesToMB(fileSizeBytes)
      });
    }
    reservedBytes = fileSizeBytes;

    const newFile = await File.create({
      userId: req.userId,
      fileName,
      fileURL,
      fileSize: fileSizeBytes,
      cloudinaryPublicId: cloudinaryPublicId || "direct-upload"
    });

    const updatedUser = await syncStorageFields(req.userId);

    return res.status(201).json({
      success: true,
      message: "File metadata saved successfully",
      file: newFile,
      storageUsedMB: updatedUser?.storageUsedMB,
      storageLimitMB: STORAGE_LIMIT_MB
    });
  } catch (error) {
    if (reservedBytes > 0) {
      await decrementStorage(req.userId, reservedBytes);
    }

    return res.status(500).json({
      success: false,
      message: "Error saving file metadata",
      error: error.message
    });
  }
};

exports.getFiles = async (req, res) => {
  try {
    await purgeExpiredTrashForUser(req.userId);
    const files = await File.find({
      userId: req.userId,
      isTrashed: { $ne: true }
    }).sort({ uploadedAt: -1 });
    return res.json(files);
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching files",
      error: error.message
    });
  }
};

exports.getTrashFiles = async (req, res) => {
  try {
    await purgeExpiredTrashForUser(req.userId);
    const files = await File.find({
      userId: req.userId,
      isTrashed: true
    }).sort({ trashedAt: -1, uploadedAt: -1 });
    return res.json(files);
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching trash files",
      error: error.message
    });
  }
};

exports.moveFileToTrash = async (req, res) => {
  try {
    await purgeExpiredTrashForUser(req.userId);

    const file = await File.findOne({
      _id: req.params.id,
      userId: req.userId,
      isTrashed: { $ne: true }
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    file.isTrashed = true;
    file.trashedAt = new Date();
    await file.save();

    return res.json({ message: "File moved to trash", file });
  } catch (error) {
    return res.status(500).json({
      message: "Error moving file to trash",
      error: error.message
    });
  }
};

exports.restoreFileFromTrash = async (req, res) => {
  try {
    await purgeExpiredTrashForUser(req.userId);

    const file = await File.findOne({
      _id: req.params.id,
      userId: req.userId,
      isTrashed: true
    });

    if (!file) {
      return res.status(404).json({ message: "File not found in trash" });
    }

    file.isTrashed = false;
    file.trashedAt = null;
    await file.save();

    return res.json({ message: "File restored from trash", file });
  } catch (error) {
    return res.status(500).json({
      message: "Error restoring file from trash",
      error: error.message
    });
  }
};

exports.deleteTrashedFile = async (req, res) => {
  try {
    await purgeExpiredTrashForUser(req.userId);

    const file = await File.findOne({
      _id: req.params.id,
      userId: req.userId,
      isTrashed: true
    });

    if (!file) {
      return res.status(404).json({ message: "File not found in trash" });
    }

    if (file.cloudinaryPublicId) {
      try {
        const { cluster } = await getUserAndCluster(req.userId);
        await destroyFromCloudinary(cluster, file.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.warn("cloudinary delete warning:", cloudinaryError.message);
      }
    }

    const deleted = await File.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
      isTrashed: true
    });

    if (deleted && deleted.fileSize) {
      await decrementStorage(req.userId, deleted.fileSize);
    }

    return res.json({ message: "File permanently deleted" });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting trashed file",
      error: error.message
    });
  }
};

exports.setFavorite = async (req, res) => {
  try {
    const { isFavorite } = req.body;
    if (typeof isFavorite !== "boolean") {
      return res.status(400).json({ message: "isFavorite must be boolean" });
    }

    const updated = await File.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId,
        isTrashed: { $ne: true }
      },
      { $set: { isFavorite } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.json({ message: "Favorite updated", file: updated });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating favorite",
      error: error.message
    });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.userId,
      isTrashed: { $ne: true }
    });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (file.cloudinaryPublicId) {
      try {
        const { cluster } = await getUserAndCluster(req.userId);
        await destroyFromCloudinary(cluster, file.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.warn("cloudinary delete warning:", cloudinaryError.message);
      }
    }

    const deleted = await File.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
      isTrashed: { $ne: true }
    });

    if (deleted && deleted.fileSize) {
      await decrementStorage(req.userId, deleted.fileSize);
    }

    return res.json({ message: "File deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting file",
      error: error.message
    });
  }
};

exports.renameFile = async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName || newName.trim() === "") {
      return res.status(400).json({ message: "New name is required" });
    }

    const file = await File.findOne({
      _id: req.params.id,
      userId: req.userId,
      isTrashed: { $ne: true }
    });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const updated = await File.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, isTrashed: { $ne: true } },
      { fileName: newName.trim() },
      { new: true }
    );

    return res.json({ message: "File renamed successfully", file: updated });
  } catch (error) {
    return res.status(500).json({
      message: "Error renaming file",
      error: error.message
    });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.userId,
      isTrashed: { $ne: true }
    });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (!file.fileURL) {
      return res.status(400).json({ message: "File URL not available" });
    }

    return res.redirect(file.fileURL);
  } catch (error) {
    return res.status(500).json({
      message: "Error downloading file",
      error: error.message
    });
  }
};

exports.checkStorage = async (req, res) => {
  try {
    await purgeExpiredTrashForUser(req.userId);

    const user = await syncStorageFields(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userFiles = await File.find({
      userId: req.userId,
      isTrashed: { $ne: true }
    }).sort({ uploadedAt: -1 });

    const storageUsed = user.storageUsed;
    const storageAvailable = Math.max(0, STORAGE_LIMIT_BYTES - storageUsed);
    const storagePercentage = ((storageUsed / STORAGE_LIMIT_BYTES) * 100).toFixed(2);

    return res.json({
      message: "Storage check successful",
      fileCount: userFiles.length,
      storageUsed,
      storageUsedMB: user.storageUsedMB,
      storageLimit: STORAGE_LIMIT_BYTES,
      storageLimitMB: STORAGE_LIMIT_MB,
      storageAvailable,
      storageAvailableMB: bytesToMB(storageAvailable),
      storagePercentage,
      files: userFiles
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error checking storage",
      error: error.message
    });
  }
};
