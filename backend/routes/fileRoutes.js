const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const { uploadFile, getFiles, deleteFile, renameFile, downloadFile, checkStorage } = require("../controllers/fileController");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", auth, getFiles);
router.post("/upload", auth, upload.single("file"), uploadFile);
router.delete("/:id", auth, deleteFile);
router.put("/rename/:id", auth, renameFile);
router.get("/download/:id", auth, downloadFile);
router.get("/check-storage", auth, checkStorage);

module.exports = router;
