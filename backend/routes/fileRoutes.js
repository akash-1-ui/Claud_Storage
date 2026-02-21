const express = require("express");
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const {
  uploadFile,
  saveFileMetadata,
  getFiles,
  deleteFile,
  renameFile,
  downloadFile,
  checkStorage
} = require("../controllers/fileController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB max per file
  }
});

router.get("/", auth, getFiles);
router.post("/upload", auth, upload.single("file"), uploadFile);
router.post("/save", auth, saveFileMetadata);
router.delete("/:id", auth, deleteFile);
router.put("/rename/:id", auth, renameFile);
router.get("/download/:id", auth, downloadFile);
router.get("/check-storage", auth, checkStorage);

module.exports = router;
