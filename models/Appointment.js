const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    customerId: { type: String, required: true },
    partnerId: { type: String, required: true },
    scheduledTime: { type: Date, required: true },
    durationMinutes: { type: Number, default: 30 },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled', 'missed'],
        default: 'pending'
    },
    rejectionReason: { type: String },
    createdAt: { type: Date, default: Date.now },
    customerJoined: { type: Boolean, default: false },
    partnerJoined: { type: Boolean, default: false }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
