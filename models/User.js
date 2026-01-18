const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Custom ID (c_ timestamp or EMP)
    mobile: String,
    firstName: String,
    lastName: String,
    role: { type: String, enum: ['customer', 'partner'], required: true },
    partnerRole: { type: String, enum: ['normal', 'expert'] }, // Only for partners

    // Auth & Status
    fcmToken: String,
    isVerified: { type: Boolean, default: false },
    currentStatus: { type: String, default: 'offline' }, // online, busy, offline
    isBlocked: { type: Boolean, default: false },

    // Profile
    profilePic: String,
    gender: String,
    dob: String,
    location: String,
    languages: [String],
    interests: [String],
    expertise: [String],
    about: String,

    // Wallet & Rates
    walletAmount: { type: Number, default: 0 },
    chatRate: { type: Number, default: 0 },
    audioCallRate: { type: Number, default: 0 },

    // Engagement
    likes: [String], // Array of IDs
    averageRating: { type: Number, default: 0 },
    startedAt: Date,

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
