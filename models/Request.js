const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    type: { type: String, enum: ['payout', 'leave'], required: true },
    userId: { type: String, required: true },
    userName: String, // Snapshot
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

    // Payout Specific
    amount: Number,
    upiId: String,

    // Leave Specific
    leaveDate: String,
    reason: String,

    adminComment: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', RequestSchema);
