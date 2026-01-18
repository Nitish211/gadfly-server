require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dbAdapter = require('./db_adapter');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve Admin Website

// --- DATABASE CONNECTION ---
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log("✅ Custom: Connected to MongoDB Cloud"))
        .catch(err => console.error("❌ MongoDB Error:", err));
} else {
    console.log("⚠️ No MONGODB_URI found. Using Local JSON Database.");
}

// --- ROUTES ---

// Login (Admin)
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ success: true, message: "Login Successful" });
    } else {
        res.status(401).json({ success: false, message: "Invalid Credentials" });
    }
});

// Mobile Login (OTP)
app.post('/api/auth/mobile-login', async (req, res) => {
    try {
        const { mobile, otp } = req.body;
        if (otp != 1234) return res.status(401).json({ success: false, message: "Invalid OTP" });

        const user = await dbAdapter.loginOrRegister(mobile, {
            id: `c_${Date.now()}`,
            role: 'customer',
            walletAmount: 100,
            isVerified: true,
            createdAt: new Date(),
            likes: [],
            profilePic: "https://randomuser.me/api/portraits/men/1.jpg"
        });

        res.json({ success: true, message: "Login Successful", data: { user, regId: user.id } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get User
app.get('/api/user/:id', async (req, res, next) => {
    const { id } = req.params;
    if (id === 'rate' || id === 'likes') return next();

    try {
        const user = await dbAdapter.getUser(id);
        if (user) res.json({ success: true, data: user });
        else res.status(404).json({ success: false, message: "User not found" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get Partners
app.get('/api/user', async (req, res) => {
    try {
        const { role, includeBlocked, search } = req.query;
        if (role === 'partner') {
            const partners = await dbAdapter.getPartners(search, includeBlocked);
            res.json({ status: 200, message: "Success", data: partners });
        } else {
            // Simplified for now
            res.json({ status: 200, message: "Success", data: [] });
        }
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Toggle Favorite
app.post('/api/user/likeToggle', async (req, res) => {
    try {
        const { userId, partnerId } = req.body;
        console.log(`Toggle: ${userId} -> ${partnerId}`);
        const result = await dbAdapter.toggleLike(userId, partnerId);
        if (result.success) res.json({ success: true, message: "Success", data: result });
        else res.status(404).json(result);
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get Favorites
app.get('/api/user/likes/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await dbAdapter.getUser(userId);
        if (!user || !user.likes) return res.json({ success: true, data: [] });

        // Fetch full objects for likes
        // Optimization: In Mongo use $in, here loop
        // The adapter currently doesn't have getMany, so we iterate
        const partners = [];
        for (const pid of user.likes) {
            const p = await dbAdapter.getUser(pid);
            if (p) partners.push(p);
        }
        res.json({ success: true, data: partners });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Gifts (Simple Pass-through for now)
app.get('/api/gifts', async (req, res) => {
    const gifts = await dbAdapter.getGifts();
    res.json({ success: true, data: gifts });
});

app.post('/api/add_gift', async (req, res) => {
    const gift = await dbAdapter.addGift(req.body);
    res.json({ success: true, data: gift });
});

app.listen(PORT, () => {
    console.log(`Gadfly Server running on port ${PORT}`);
});
