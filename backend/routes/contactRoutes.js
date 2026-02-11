const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../controllers/contactController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, sendContactEmail);

module.exports = router;
