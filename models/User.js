const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String },
    mobile: { type: String, required: true, unique: true },
    email: { type: String },
    gender: { type: String },
    dob: { type: String },
    profilePic: { type: String, default: "" },
    role: {
        type: String,
        enum: ['customer', 'partner', 'admin'],
        default: 'customer'
    },

    // Status
    isVerified: { type: Boolean, default: false }, // Critical for Partners
    isBlocked: { type: Boolean, default: false },
    currentStatus: { type: String, default: 'offline' }, // online, busy, offline
    fcmToken: { type: String }, // For Push Notifications

    // Wallet
    walletAmount: { type: Number, default: 0 },

    // Partner Specific Fields
    audioClip: { type: String }, // Voice Intro
    partnerRole: { type: String, enum: ['normal', 'expert'] },
    audioCallRate: { type: Number, default: 0 },
    chatRate: { type: Number, default: 0 },
    about: { type: String },
    languages: [{ type: String }],

    // Metadata
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
