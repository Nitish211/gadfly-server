const mongoose = require('mongoose');

const InteractionSchema = new mongoose.Schema({
    partnerId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    totalDuration: { type: Number, default: 0 }, // Seconds spoken lifetime
    lastInteractionAt: { type: Date, default: Date.now }
});

// Composite index for fast lookup
InteractionSchema.index({ partnerId: 1, customerId: 1 }, { unique: true });

module.exports = mongoose.model('Interaction', InteractionSchema);
