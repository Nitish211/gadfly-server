const Otp = require('../models/Otp');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Generate OTP
// @route   POST /api/auth/generate-otp
// @access  Public
// @desc    Generate OTP (MOCK - Just returns success)
// @route   POST /api/auth/generate-otp
// @access  Public
const generateOtp = async (req, res) => {
    const { mobile } = req.body;

    if (!mobile) {
        return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }

    try {
        // MOCK: Don't interact with DB or SMS. Just say success.
        // We act as if OTP is sent, but actually we will accept ANY pin in the next step.
        console.log(`Mock OTP request for ${mobile}`);

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            data: { otp: "1234" } // Optional dummy
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Verify OTP (MOCK - Accepts any PIN)
// @route   POST /api/auth/mobile-login
// @access  Public
const verifyOtp = async (req, res) => {
    const { mobile, otp, deviceId } = req.body; // 'otp' here is basically the PIN user entered

    if (!mobile || !otp) {
        return res.status(400).json({ success: false, message: 'Mobile and PIN are required' });
    }

    try {
        // MOCK: Skip OTP DB Check.
        // Direct User Check

        // Check if user exists
        let user = await User.findOne({ mobile });
        let isRegistered = false;

        if (user) {
            isRegistered = true;
        }

        let responseData = {
            isRegistered,
            mobile
        };

        if (isRegistered) {
            responseData.token = generateToken(user._id);
            responseData.user = user;
        }

        // Return Success (Always verified)
        res.status(200).json({
            success: true,
            message: 'PIN Verified',
            data: responseData
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = { generateOtp, verifyOtp };
