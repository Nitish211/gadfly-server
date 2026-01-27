const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Custom ID (c_ timestamp or EMP)
    mobile: String,
    firstName: String,
    lastName: String,
    role: { type: String, enum: ['customer', 'partner'], required: true },
    partnerRole: { type: String, enum: ['basic', 'pro', 'expert', 'normal'], default: 'basic' }, // 'normal' kept for backward compat (mapped to pro)

    // Auth & Status
    fcmToken: String,
    isVerified: { type: Boolean, default: false },
    currentStatus: { type: String, default: 'offline' }, // online, busy, offline
    isBlocked: { type: Boolean, default: false },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'verified' },
    voiceUrl: { type: String, default: '' },
    emplid: String, // Admin Employee ID

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
    isVideoCallEnabled: { type: Boolean, default: false }, // Admin Control for Video

    // Engagement
    likes: [String], // Array of IDs
    averageRating: { type: Number, default: 0 },
    startedAt: Date,

    // Stats for Rules Engine
    missedCalls: { type: Number, default: 0 },
    totalCallMinutes: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    lastLogin: Date,
    onlineTimeToday: { type: Number, default: 0 }, // in minutes
    dailyCallMinutes: { type: Number, default: 0 }, // For 'Hit Century' bonus
    missedCallsToday: { type: Number, default: 0 }, // For 'Missed Call Tax'

    // Partner Rules V10 Fields
    dailyCallCuts: { type: Number, default: 0 }, // Track call cuts
    isProbation: { type: Boolean, default: false }, // 50% reward cut mode
    probationExpiresAt: Date,

    dailyGiftCount: { type: Number, default: 0 }, // Number of gifts today
    dailyGiftValue: { type: Number, default: 0 }, // Value of gifts today
    dailyOnlineRewardTier: { type: Number, default: 0 }, // 0, 6, 8, 10, 12 (Last paid)
    hasHitSilverStar: { type: Boolean, default: false },
    hasHitGoldStar: { type: Boolean, default: false },

    couponCode: { type: String, unique: true, sparse: true }, // e.g. ANNIE20

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
