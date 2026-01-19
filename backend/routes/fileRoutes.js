const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const { uploadFile } = require("../controllers/fileController");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", auth, upload.single("file"), uploadFile);

module.exports = router;
