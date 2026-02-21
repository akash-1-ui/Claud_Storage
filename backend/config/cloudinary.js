const cloudinary = require("cloudinary").v2;

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

const uploadBufferToCloudinary = (cluster, buffer, options = {}) => {
  const auth = buildCloudinaryAuth(cluster);

  return new Promise((resolve, reject) => {
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
