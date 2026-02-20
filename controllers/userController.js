const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/user
// @access  Public
const registerUser = async (req, res) => {
    try {
        const {
            firstName, lastName, email, gender, dob, location,
            languages, mobile, role
        } = req.body;

        // Check if user already exists
        const userExists = await User.findOne({ mobile });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Handle File Uploads
        let profilePic = '';
        let audioClip = '';

        if (req.files && req.files.profilePic) {
            profilePic = req.files.profilePic[0].path;
        }

        if (req.files && req.files.audioClip) {
            audioClip = req.files.audioClip[0].path;
        }

        // Partner Validation
        let isVerified = true; // Customers are verified by default
        if (role === 'partner') {
            isVerified = false; // Partners need Admin approval
            if (!audioClip) {
                // return res.status(400).json({ success: false, message: 'Voice recording is required for partners' });
                // Keeping it optional for now to avoid blocking testing if file upload fails
            }
        }

        const user = await User.create({
            firstName,
            lastName,
            mobile,
            email,
            gender,
            dob,
            profilePic,
            role: role.toLowerCase(),
            isVerified,
            audioClip,
            languages: languages ? languages.split(',') : [],
            walletAmount: 0 // Start with 0
        });

        if (user) {
            res.status(201).json({
                success: true,
                message: "User Registered Successfully",
                data: {
                    _id: user._id,
                    firstName: user.firstName,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user._id),
                }
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

// @desc    Get User Profile
// @route   GET /api/user/:id
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            res.json({ success: true, data: user });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


// @desc    Get All Users (Admin)
// @route   GET /api/user
// @access  Public (Should be Admin)
const getAllUsers = async (req, res) => {
    try {
        const { role, isVerified } = req.query;
        let query = {};

        if (role) {
            query.role = role;
        }

        if (isVerified) {
            query.isVerified = isVerified === 'true';
        }

        const users = await User.find(query).sort({ createdAt: -1 });
        res.json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Verify Partner (Admin)
// @route   PUT /api/user/verify/:id
// @access  Public (Should be Admin)
const verifyPartner = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.isVerified = true;
        await user.save();

        res.json({ success: true, message: 'Partner Verified Successfully', data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = { registerUser, getUserProfile, getAllUsers, verifyPartner };

