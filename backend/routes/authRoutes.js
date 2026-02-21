const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getProfile,
  changePassword
} = require("../controllers/authController");
const auth = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/change-password", auth, changePassword);
router.get("/profile", auth, getProfile);

module.exports = router;
