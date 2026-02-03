const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const { uploadFile, getFiles } = require("../controllers/fileController");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", auth, getFiles);
router.post("/upload", auth, upload.single("file"), uploadFile);

module.exports = router;
