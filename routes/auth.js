const express = require('express');
const router = express.Router();
const { generateOtp, verifyOtp } = require('../controllers/authController');

router.post('/generate-otp', generateOtp);
router.post('/mobile-login', verifyOtp);

module.exports = router;
