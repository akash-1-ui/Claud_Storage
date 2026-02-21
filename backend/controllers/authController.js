const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Cluster = require("../models/clusterModel");
const File = require("../models/File");

const ONE_MB = 1024 * 1024;
const STORAGE_LIMIT_MB = 1024;
const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_MB * ONE_MB;

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1h"
  });

const bytesToMB = (bytes) => Number((bytes / ONE_MB).toFixed(4));

const syncClusterUsageFromUsers = async () => {
  const usage = await User.aggregate([
    {
      $match: {
        clusterName: { $exists: true, $ne: null },
        cloudName: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: {
          clusterName: "$clusterName",
          cloudName: "$cloudName"
        },
        count: { $sum: 1 }
      }
    }
  ]);

  const usageByCluster = new Map(
    usage.map((row) => [`${row._id.clusterName}::${row._id.cloudName}`, row.count])
  );

  const clusters = await Cluster.find({}, { _id: 1, clusterName: 1, cloudName: 1 }).lean();
  if (clusters.length === 0) {
    return;
  }

  const bulkOps = clusters.map((cluster) => {
    const key = `${cluster.clusterName}::${cluster.cloudName}`;
    return {
      updateOne: {
        filter: { _id: cluster._id },
        update: { $set: { currentUsers: usageByCluster.get(key) || 0 } }
      }
    };
  });

  await Cluster.bulkWrite(bulkOps, { ordered: false });
};

const buildUserResponse = (user) => ({
  id: user._id,
  name: user.username,
  email: user.email,
  clusterName: user.clusterName,
  cloudName: user.cloudName,
  storageUsedMB: user.storageUsedMB,
  storageLimitMB: user.storageLimitMB,
  storageUsed: user.storageUsed,
  storageLimit: user.storageLimit
});

exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "username, email and password are required"
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();

  try {
    const userExists = await User.findOne({ email: normalizedEmail }).lean();
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "User already exists"
      });
    }

    // Keep cluster counters aligned with real user assignments.
    await syncClusterUsageFromUsers();

    const hashedPassword = await bcrypt.hash(password, 10);

    let assignedCluster = null;
    let userCreated = false;

    try {
      assignedCluster = await Cluster.findOneAndUpdate(
        { $expr: { $lt: ["$currentUsers", "$maxUsers"] } },
        { $inc: { currentUsers: 1 } },
        {
          sort: { currentUsers: 1, _id: 1 },
          new: true
        }
      );

      if (!assignedCluster) {
        return res.status(503).json({
          success: false,
          message: "No cluster capacity available"
        });
      }

      const user = await User.create({
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
        clusterName: assignedCluster.clusterName,
        cloudName: assignedCluster.cloudName,
        storageUsedMB: 0,
        storageLimitMB: STORAGE_LIMIT_MB,
        storageUsed: 0,
        storageLimit: STORAGE_LIMIT_BYTES
      });
      userCreated = true;

      return res.status(201).json({
        success: true,
        token: generateToken(user._id),
        user: buildUserResponse(user)
      });
    } catch (error) {
      if (assignedCluster && !userCreated) {
        await Cluster.findOneAndUpdate(
          { _id: assignedCluster._id, currentUsers: { $gt: 0 } },
          { $inc: { currentUsers: -1 } }
        );
      }
      throw error;
    }
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User already exists"
      });
    }

    console.error("register error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please register."
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }

    return res.json({
      success: true,
      token: generateToken(user._id),
      user: buildUserResponse(user)
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const aggregation = await File.aggregate([
      { $match: { userId: String(req.userId) } },
      { $group: { _id: null, totalBytes: { $sum: "$fileSize" } } }
    ]);

    const storageUsedBytes = aggregation[0]?.totalBytes || 0;
    const storageUsedMB = bytesToMB(storageUsedBytes);

    if (
      user.storageUsed !== storageUsedBytes ||
      user.storageUsedMB !== storageUsedMB ||
      user.storageLimit !== STORAGE_LIMIT_BYTES ||
      user.storageLimitMB !== STORAGE_LIMIT_MB
    ) {
      await User.findByIdAndUpdate(req.userId, {
        $set: {
          storageUsed: storageUsedBytes,
          storageUsedMB,
          storageLimit: STORAGE_LIMIT_BYTES,
          storageLimitMB: STORAGE_LIMIT_MB
        }
      });
      user.storageUsed = storageUsedBytes;
      user.storageUsedMB = storageUsedMB;
      user.storageLimit = STORAGE_LIMIT_BYTES;
      user.storageLimitMB = STORAGE_LIMIT_MB;
    }

    return res.json({
      success: true,
      user: buildUserResponse(user)
    });
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters"
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
