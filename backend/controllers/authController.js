const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const https = require("https");
const crypto = require("crypto");
const User = require("../models/userModel");
const Cluster = require("../models/clusterModel");
const File = require("../models/File");

const ONE_MB = 1024 * 1024;
const STORAGE_LIMIT_MB = 1024;
const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_MB * ONE_MB;
const MAX_PROFILE_PHOTO_LENGTH = 5 * ONE_MB;

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1h"
  });

const bytesToMB = (bytes) => Number((bytes / ONE_MB).toFixed(4));

const clusterCapacityFilter = { $expr: { $lt: ["$currentUsers", "$maxUsers"] } };

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

const reserveNextClusterSlot = async () =>
  Cluster.findOneAndUpdate(
    clusterCapacityFilter,
    { $inc: { currentUsers: 1 } },
    {
      // Fill clusters in a stable order: first cluster to capacity, then next.
      sort: { createdAt: 1, _id: 1 },
      new: true
    }
  );

const reserveNextClusterSlotWithSelfHeal = async () => {
  let assignedCluster = await reserveNextClusterSlot();
  if (assignedCluster) {
    return assignedCluster;
  }

  // Handle out-of-band DB edits (e.g., manual user deletes) that can stale counters.
  await syncClusterUsageFromUsers();
  assignedCluster = await reserveNextClusterSlot();
  return assignedCluster;
};

const assignLegacyUsersWithoutCluster = async () => {
  const legacyUsers = await User.find(
    {
      $or: [
        { clusterName: { $exists: false } },
        { clusterName: null },
        { clusterName: "" },
        { cloudName: { $exists: false } },
        { cloudName: null },
        { cloudName: "" }
      ]
    },
    { _id: 1 }
  ).lean();

  if (legacyUsers.length === 0) {
    return;
  }

  // Start from trusted counters derived from currently assigned users.
  await syncClusterUsageFromUsers();

  for (const legacyUser of legacyUsers) {
    const assignedCluster = await reserveNextClusterSlot();
    if (!assignedCluster) {
      throw new Error("No cluster capacity available for legacy users");
    }

    await User.findByIdAndUpdate(legacyUser._id, {
      $set: {
        clusterName: assignedCluster.clusterName,
        cloudName: assignedCluster.cloudName,
        storageLimitMB: STORAGE_LIMIT_MB,
        storageLimit: STORAGE_LIMIT_BYTES
      }
    });
  }
};

const buildUserResponse = (user) => ({
  id: user._id,
  name: user.username,
  email: user.email,
  profilePhoto: user.profilePhoto || "",
  clusterName: user.clusterName,
  cloudName: user.cloudName,
  storageUsedMB: user.storageUsedMB,
  storageLimitMB: user.storageLimitMB,
  storageUsed: user.storageUsed,
  storageLimit: user.storageLimit
});

const createUserWithAvailableCluster = async ({ username, email, hashedPassword }) => {
  await assignLegacyUsersWithoutCluster();

  let assignedCluster = null;
  let userCreated = false;

  try {
    assignedCluster = await reserveNextClusterSlotWithSelfHeal();

    if (!assignedCluster) {
      return {
        user: null,
        status: 503,
        message: "No cluster capacity available"
      };
    }

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      clusterName: assignedCluster.clusterName,
      cloudName: assignedCluster.cloudName,
      storageUsedMB: 0,
      storageLimitMB: STORAGE_LIMIT_MB,
      storageUsed: 0,
      storageLimit: STORAGE_LIMIT_BYTES
    });

    userCreated = true;
    return { user, status: 201 };
  } catch (error) {
    if (assignedCluster && !userCreated) {
      await Cluster.findOneAndUpdate(
        { _id: assignedCluster._id, currentUsers: { $gt: 0 } },
        { $inc: { currentUsers: -1 } }
      );
    }
    throw error;
  }
};

const fetchGoogleTokenInfo = (credential) =>
  new Promise((resolve, reject) => {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;

    https
      .get(url, (response) => {
        let rawData = "";

        response.on("data", (chunk) => {
          rawData += chunk;
        });

        response.on("end", () => {
          let parsed = {};

          try {
            parsed = JSON.parse(rawData || "{}");
          } catch {
            reject(new Error("Invalid response from Google token validation"));
            return;
          }

          if (response.statusCode !== 200) {
            const message = parsed.error_description || parsed.error || "Invalid Google credential";
            reject(new Error(message));
            return;
          }

          resolve(parsed);
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });

const verifyGoogleCredential = async (credential) => {
  if (!credential) {
    throw new Error("Google credential is required");
  }

  const tokenInfo = await fetchGoogleTokenInfo(credential);
  const expectedClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();

  if (expectedClientId && tokenInfo.aud !== expectedClientId) {
    throw new Error("Google client ID mismatch");
  }

  if (tokenInfo.email_verified !== "true") {
    throw new Error("Google account email is not verified");
  }

  if (!tokenInfo.email) {
    throw new Error("Google account does not include an email");
  }

  return tokenInfo;
};

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

    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUserResult = await createUserWithAvailableCluster({
      username: normalizedUsername,
      email: normalizedEmail,
      hashedPassword
    });

    if (!createdUserResult.user) {
      return res.status(createdUserResult.status).json({
        success: false,
        message: createdUserResult.message
      });
    }

    const user = createdUserResult.user;

    return res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: buildUserResponse(user)
    });
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

exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required"
      });
    }

    const googleProfile = await verifyGoogleCredential(credential);
    const normalizedEmail = googleProfile.email.trim().toLowerCase();
    const fallbackUsername = normalizedEmail.split("@")[0];
    const normalizedUsername = (
      googleProfile.name ||
      googleProfile.given_name ||
      fallbackUsername
    ).trim();

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      const createdUserResult = await createUserWithAvailableCluster({
        username: normalizedUsername,
        email: normalizedEmail,
        hashedPassword
      });

      if (!createdUserResult.user) {
        return res.status(createdUserResult.status).json({
          success: false,
          message: createdUserResult.message
        });
      }

      user = createdUserResult.user;
    }

    return res.json({
      success: true,
      token: generateToken(user._id),
      user: buildUserResponse(user)
    });
  } catch (error) {
    console.error("google login error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Google sign-in failed"
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

exports.updateProfilePhoto = async (req, res) => {
  try {
    const rawProfilePhoto = req.body?.profilePhoto;
    const normalizedProfilePhoto = typeof rawProfilePhoto === "string" ? rawProfilePhoto.trim() : "";

    if (normalizedProfilePhoto && !normalizedProfilePhoto.startsWith("data:image/")) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile photo format"
      });
    }

    if (normalizedProfilePhoto.length > MAX_PROFILE_PHOTO_LENGTH) {
      return res.status(413).json({
        success: false,
        message: "Profile photo payload is too large"
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { profilePhoto: normalizedProfilePhoto } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      message: normalizedProfilePhoto ? "Profile photo updated" : "Profile photo removed",
      user: buildUserResponse(user)
    });
  } catch (error) {
    console.error("updateProfilePhoto error:", error);
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

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;

    // Get user first to update cluster count
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Delete all files associated with the user
    await File.deleteMany({ userId: String(userId) });

    // Delete the user account
    await User.findByIdAndDelete(userId);

    // Update cluster currentUsers count
    if (user.clusterName && user.cloudName) {
      await Cluster.findOneAndUpdate(
        { clusterName: user.clusterName, cloudName: user.cloudName },
        { $inc: { currentUsers: -1 } }
      );
    }

    return res.json({
      success: true,
      message: "Account deleted successfully"
    });
  } catch (error) {
    console.error("deleteAccount error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
