const mongoose = require('mongoose');

const GiftSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    icon: String, // URL or Base64
    price: Number,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Gift', GiftSchema);
