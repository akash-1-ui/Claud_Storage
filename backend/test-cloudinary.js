require("dotenv").config();
const {
  uploadBufferToCloudinary,
  destroyFromCloudinary
} = require("./config/cloudinary");

const cluster = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET
};

if (!cluster.cloudName || !cluster.apiKey || !cluster.apiSecret) {
  console.error("Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET");
  process.exit(1);
}

const testBuffer = Buffer.from("test file content for upload");

uploadBufferToCloudinary(cluster, testBuffer, {
  resource_type: "auto",
  public_id: `test_${Date.now()}`,
  timeout: 120000
})
  .then(async (result) => {
    console.log("Upload test passed:", result.public_id);
    await destroyFromCloudinary(cluster, result.public_id);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Upload test failed:", error.message);
    process.exit(1);
  });
