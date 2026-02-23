const express = require("express");
const router = express.Router();
const {
  register,
  login,
  googleLogin,
  getProfile,
  changePassword,
  deleteAccount
} = require("../controllers/authController");
const auth = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/change-password", auth, changePassword);
router.get("/profile", auth, getProfile);
router.delete("/delete-account", auth, deleteAccount);

module.exports = router;
