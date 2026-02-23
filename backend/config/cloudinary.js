const cloudinary = require("cloudinary").v2;

const DEFAULT_UNSIGNED_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "course_uploads";

const buildCloudinaryAuth = (cluster) => {
  if (!cluster) {
    throw new Error("Cluster credentials are required");
  }

  if (!cluster.cloudName || !cluster.apiKey || !cluster.apiSecret) {
    throw new Error("Cluster is missing Cloudinary credentials");
  }

  return {
    cloud_name: cluster.cloudName,
    api_key: cluster.apiKey,
    api_secret: cluster.apiSecret
  };
};

const buildCloudinaryCloudName = (cluster) => {
  if (!cluster || !cluster.cloudName) {
    throw new Error("Cluster cloudName is required");
  }

  return cluster.cloudName;
};

const uploadWithSignedCredentials = (auth, buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { ...options, ...auth },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });

const uploadWithUnsignedPreset = (cloudName, uploadPreset, buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.unsigned_upload_stream(
      uploadPreset,
      { ...options, cloud_name: cloudName },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });

const uploadBufferToCloudinary = (cluster, buffer, options = {}) => {
  const uploadPreset = options.upload_preset || DEFAULT_UNSIGNED_UPLOAD_PRESET;

  if (uploadPreset) {
    const cloudName = buildCloudinaryCloudName(cluster);
    return uploadWithUnsignedPreset(cloudName, uploadPreset, buffer, options);
  }

  const auth = buildCloudinaryAuth(cluster);
  return uploadWithSignedCredentials(auth, buffer, options);
};

const destroyFromCloudinary = (cluster, publicId, options = {}) => {
  const auth = buildCloudinaryAuth(cluster);
  return cloudinary.uploader.destroy(publicId, { ...options, ...auth });
};

module.exports = {
  buildCloudinaryAuth,
  uploadBufferToCloudinary,
  destroyFromCloudinary
};
