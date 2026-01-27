const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // User who owns this transaction
    type: { type: String, enum: ['credit', 'debit'], required: true },
    category: {
        type: String,
        enum: ['recharge', 'call_earning', 'gift_earning', 'call_cost', 'gift_cost', 'fine', 'bonus', 'withdrawal'],
        required: true
    },
    amount: { type: Number, required: true }, // Coins for Customers, Rupees for Partners
    description: String, // e.g. "Call with Priya S.", "Fine for low online time"
    relatedUserId: String, // e.g. The partner you called, or customer who gave gift
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
