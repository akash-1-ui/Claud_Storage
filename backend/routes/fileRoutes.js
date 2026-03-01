const express = require("express");
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const {
  uploadFile,
  saveFileMetadata,
  getFiles,
  getTrashFiles,
  moveFileToTrash,
  restoreFileFromTrash,
  deleteTrashedFile,
  setFavorite,
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
router.get("/trash", auth, getTrashFiles);
router.post("/upload", auth, upload.single("file"), uploadFile);
router.post("/save", auth, saveFileMetadata);
router.post("/trash/:id", auth, moveFileToTrash);
router.post("/restore/:id", auth, restoreFileFromTrash);
router.delete("/trash/:id", auth, deleteTrashedFile);
router.patch("/favorite/:id", auth, setFavorite);
router.delete("/:id", auth, deleteFile);
router.put("/rename/:id", auth, renameFile);
router.get("/download/:id", auth, downloadFile);
router.get("/check-storage", auth, checkStorage);

module.exports = router;
