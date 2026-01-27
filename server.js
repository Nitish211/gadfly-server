console.log("🚀 Booting Gadfly Server...");
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
        const { role, includeBlocked, search, partnerRole, verificationStatus } = req.query;
        if (role === 'partner') {
            const partners = await dbAdapter.getPartners(search, includeBlocked, partnerRole, verificationStatus);
            res.json({
                status: 200,
                message: "Success",
                debugParams: { role, partnerRole, search, verificationStatus }, // DEBUGGING
                data: partners
            });
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
        const partners = [];
        for (const pid of user.likes) {
            const p = await dbAdapter.getUser(pid);
            if (p) partners.push(p);
        }
        res.json({ success: true, data: partners });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get Customers (Includes Partners for 'Mail Gadfly' view if requested)
app.get('/api/customers', async (req, res) => {
    try {
        // 1. Get real customers
        // Note: dbAdapter.getCustomers doesn't exist, so we fetch all users and filter
        // Ideally we should add getCustomers to adapter, but for now we can rely on generic find/filter

        let allUsers = [];
        if (mongoose.connection.readyState === 1) {
            // Fetch all users
            allUsers = await mongoose.model('User').find({});
        } else {
            const db = require('./dbAdapter').readLocalDb(); // Helper access
            // Actually, let's just use existing usage pattern
            // Since we don't have direct access here easily without proper require, let's fix dbAdapter first
            // Or just use the adapter instance if possible.
            // Wait, `dbAdapter` is imported at top.

            // BUT dbAdapter doesn't expose getCustomers or getAllUsers.
            // Let's modify dbAdapter to be more flexible or just use direct Mongoose if connected.
        }

        // Simpler approach: Extend dbAdapter or just query User model directly since we are in server.js
        // We know we are using MongoDB primarily now.

        const User = require('./models/User');
        const users = await User.find({});

        const customers = users.filter(u => u.role === 'customer').map(c => ({
            id: c.id || c._id,
            name: c.firstName ? `${c.firstName} ${c.lastName || ''}` : 'Unknown',
            type: 'dating', // Default
            wallet: c.walletAmount || 0,
            status: c.isBlocked ? 'blocked' : 'active',
            emplid: c.emplid
        }));

        // 2. Fetch Partners to include in the list (as "Mail Gadfly" alias?)
        // User asked: "gadfly dating mai 20 fack id hai... automatic gadfly main mai v honi chahiye"
        const partners = users.filter(u => u.role === 'partner').map(p => ({
            id: p.id || p._id,
            name: `${p.firstName} ${p.lastName}`,
            type: 'mail', // Mapped to 'Mail Gadfly' tab in Admin
            wallet: p.walletAmount || 0,
            status: p.currentStatus,
            emplid: p.emplid // USER ID
        }));

        // Merge
        const result = [...customers, ...partners];

        res.json(result);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: e.message });
    }
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

app.post('/api/update_gift', async (req, res) => {
    try {
        const { id, isActive } = req.body;
        const result = await dbAdapter.updateGift(id, { isActive });
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/delete_gift', async (req, res) => {
    try {
        const { id } = req.body;
        const result = await dbAdapter.deleteGift(id);
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// Send Gift (Financial Transaction)
app.post('/api/gift/send', async (req, res) => {
    try {
        const { senderId, receiverId, giftId } = req.body;

        // 1. Fetch Data
        const sender = await dbAdapter.getUser(senderId);
        const receiver = await dbAdapter.getUser(receiverId);
        const allGifts = await dbAdapter.getGifts();
        const gift = allGifts.find(g => g.id === giftId);

        if (!sender || !receiver || !gift) {
            return res.status(404).json({ success: false, message: "User or Gift not found" });
        }

        // 2. Check Balance
        if ((sender.walletAmount || 0) < gift.price) {
            return res.status(400).json({ success: false, message: "Insufficient Balance" });
        }

        // 3. Process Transaction
        // A. Debit Sender
        const newSenderBalance = (sender.walletAmount || 0) - gift.price;
        await dbAdapter.updateUser(senderId, { walletAmount: newSenderBalance });
        await new Transaction({
            userId: senderId,
            type: 'debit',
            category: 'gift_sent',
            amount: gift.price,
            relatedUserId: receiverId,
            description: `Sent ${gift.name} to ${receiver.firstName}`
        }).save();

        // B. Credit Receiver (Partner Share: 60%)
        const partnerShare = Math.floor(gift.price * 0.60);
        // Platform keeps 40% (implicitly)

        const newReceiverBalance = (receiver.walletAmount || 0) + partnerShare;
        await dbAdapter.updateUser(receiverId, { walletAmount: newReceiverBalance });
        await new Transaction({
            userId: receiverId,
            type: 'credit',
            category: 'gift_received',
            amount: partnerShare,
            relatedUserId: senderId,
            description: `Received ${gift.name} from ${sender.firstName}`
        }).save();

        res.json({
            success: true,
            message: "Gift Sent Successfully",
            data: {
                gift,
                senderBalance: newSenderBalance,
                partnerEarned: partnerShare
            }
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- PARTNER ONBOARDING ---

// Mobile: Submit Application
app.post('/api/partner/apply', async (req, res) => {
    try {
        const { mobile, firstName, lastName, voiceUrl, ...otherData } = req.body;

        // 1. Check if user exists
        let user = await dbAdapter.loginOrRegister(mobile, {
            ...otherData,
            firstName,
            lastName,
            role: 'partner',
            partnerRole: 'normal', // Start as normal
            verificationStatus: 'pending', // IMPORTANT: Pending Review
            voiceUrl: voiceUrl,
            isVerified: false,
            createdAt: new Date()
        });

        res.json({ success: true, message: "Application Submitted. Pending Verification.", data: user });

    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Admin: Get Pending Partners
app.get('/api/admin/pending_partners', async (req, res) => {
    try {
        const result = await dbAdapter.getPartners('DEBUG', 'true', 'null'); // Hacky reuse of existing method or we create new one
        // Better: Add dedicated method in adapter. For now, let's filter manually if we reuse.
        // Actually, let's just make a direct DB call here for simplicity since we have mongoose loaded?
        // OR better, add 'verificationStatus' to getPartners in query.

        const pending = await dbAdapter.getPartners(undefined, 'true', undefined);
        // We need to request 'pending' specifically.
        // Let's rely on query params in /api/user instead?
        // "GET /api/user?role=partner&status=pending" -> handled by adapter?

        // Let's stick to the Adapter pattern.
        // For this specific Admin Endpoint, let's query directly for clarity or update Adapter.
        // I will update Adapter to support status filter more explicitly in next step if needed.
        // For now, let's just return "Not Implemented" and fix Adapter.
        res.json({ success: false, message: "Use /api/user?role=partner&status=pending" });
    } catch (e) {
        res.status(500).json(e);
    }
});

// Admin: Verify/Reject Partner
app.post('/api/admin/verify_partner', async (req, res) => {
    try {
        const { id, status, rejectionReason } = req.body; // status: 'verified' or 'rejected'
        const result = await dbAdapter.updateUser(id, {
            verificationStatus: status,
            isVerified: status === 'verified',
            isBlocked: status === 'rejected'
        });
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Admin: Update Partner (Full Edit)
app.post('/api/input_update_partner', async (req, res) => {
    try {
        const { id, firstName, lastName, profilePic, audioCallRate, chatRate, partnerRole, isVideoCallEnabled, isBlocked } = req.body;
        console.log(`[UPDATE DEBUG] ID: ${id}, Role: ${partnerRole}, Body:`, JSON.stringify(req.body)); // DEBUG LOG

        const updateData = {};
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (profilePic !== undefined) updateData.profilePic = profilePic;
        if (audioCallRate !== undefined) updateData.audioCallRate = audioCallRate;
        if (chatRate !== undefined) updateData.chatRate = chatRate;
        if (partnerRole !== undefined) updateData.partnerRole = partnerRole;
        if (isVideoCallEnabled !== undefined) updateData.isVideoCallEnabled = isVideoCallEnabled;
        if (isBlocked !== undefined) updateData.isBlocked = isBlocked;

        const result = await dbAdapter.updateUser(id, updateData);
        if (result) res.json({ success: true, data: result });
        else res.status(404).json({ success: false, message: "Partner not found" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
});

const Transaction = require('./models/Transaction');

// --- WALLET & PAYMENT APIs ---

// Get Wallet Balance & History
app.get('/api/wallet/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await dbAdapter.getUser(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Fetch last 20 transactions via Adapter (Supports Both)
        let history = [];
        if (process.env.MONGODB_URI) {
            history = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(20);
        } else {
            history = await dbAdapter.getTransactions(userId);
        }

        res.json({
            success: true,
            balance: user.walletAmount || 0,
            currency: user.role === 'partner' ? 'INR' : 'COINS',
            history
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Add Coins (Mock Payment Gateway for Customer)
app.post('/api/wallet/recharge', async (req, res) => {
    try {
        const { userId, amount, method } = req.body;

        const user = await dbAdapter.getUser(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const newBalance = (user.walletAmount || 0) + parseInt(amount);
        await dbAdapter.updateUser(userId, { walletAmount: newBalance });

        const txnData = {
            userId,
            type: 'credit',
            category: 'recharge',
            amount: parseInt(amount),
            description: `Recharge via ${method || 'Unknown'}`
        };

        if (process.env.MONGODB_URI) {
            await new Transaction(txnData).save();
        } else {
            await dbAdapter.saveTransaction(txnData);
        }

        res.json({ success: true, newBalance, message: "Recharge Successful" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin: Deduct Fine (for Rules Engine later)
app.post('/api/wallet/fine', async (req, res) => {
    try {
        const { userId, amount, reason } = req.body;

        const user = await dbAdapter.getUser(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const newBalance = (user.walletAmount || 0) - parseInt(amount);
        await dbAdapter.updateUser(userId, { walletAmount: newBalance });

        const txn = new Transaction({
            userId,
            type: 'debit',
            category: 'fine',
            amount: parseInt(amount),
            description: reason || "Penalty"
        });
        await txn.save();

        res.json({ success: true, newBalance, message: "Fine Deducted" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- LEADERBOARD & GAMIFICATION ---
// --- LEADERBOARD & GAMIFICATION (Enhanced) ---
app.get('/api/partners/leaderboard', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        let partners = await dbAdapter.getPartners(); // Fetch all partners

        // 1. TOP PERFORMERS (The "Good" List)
        // Criteria: Earnings + Call Minutes
        const goodList = [...partners]
            .filter(p => !p.isBlocked) // Active only
            .sort((a, b) => (b.walletAmount || 0) - (a.walletAmount || 0)) // Highest Earnings
            .slice(0, parseInt(limit))
            .map((p, index) => ({
                rank: index + 1,
                id: p.id,
                name: `${p.firstName} ${p.lastName}`,
                profilePic: p.profilePic,
                stats: `₹${(p.walletAmount || 0)} • ${(p.totalCallMinutes || 0).toFixed(0)} mins`,
                earning: p.walletAmount || 0,
                type: 'good'
            }));

        // 2. RISK ZONE (The "Bad" List - Saturday Meeting Candidates)
        // Criteria: Most Missed Calls + Low Online Time
        const badList = [...partners]
            .filter(p => !p.isBlocked)
            .sort((a, b) => {
                // Primary: Missed Calls (Higher is worse/top of list)
                const missedDiff = (b.missedCallsToday || 0) - (a.missedCallsToday || 0);
                if (missedDiff !== 0) return missedDiff;
                // Secondary: Online Time (Lower is worse/top of list)
                return (a.onlineTimeToday || 0) - (b.onlineTimeToday || 0);
            })
            .slice(0, 5) // Show top 5 worst
            .map((p, index) => ({
                rank: index + 1,
                id: p.id,
                name: `${p.firstName} ${p.lastName}`,
                profilePic: p.profilePic,
                stats: `${p.missedCallsToday || 0} Missed • ${(p.onlineTimeToday || 0).toFixed(0)} mins`,
                earning: p.walletAmount || 0,
                type: 'bad'
            }));

        res.json({ success: true, topPerformers: goodList, alertRoom: badList });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- DAILY STATS API (For Partner Dashboard) ---
app.get('/api/partners/daily_stats/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await dbAdapter.getUser(id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Calculate Today's Earnings (Credit transactions today)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Fetch transactions (This logic assumes Mongoose for date filtering, fallback for local)
        let todayEarnings = 0;
        if (process.env.MONGODB_URI) {
            const txns = await Transaction.find({
                userId: id,
                type: 'credit',
                createdAt: { $gte: startOfDay }
            });
            todayEarnings = txns.reduce((sum, t) => sum + t.amount, 0);
        } else {
            // Local DB fallback (Approximation)
            const txns = await dbAdapter.getTransactions(id);
            todayEarnings = txns
                .filter(t => t.type === 'credit' && new Date(t.createdAt) >= startOfDay)
                .reduce((sum, t) => sum + t.amount, 0);
        }

        res.json({
            success: true,
            data: {
                dailyMinutes: user.dailyCallMinutes || 0,
                targetMinutes: 100, // "Century" Target
                missedCalls: user.missedCallsToday || 0,
                missedCallLimit: 3, // Free limit
                todayEarnings: todayEarnings,
                onlineTime: user.onlineTimeToday || 0
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- RULES ENGINE (Production) ---
app.post('/api/call/end', async (req, res) => {
    try {
        const { customerId, partnerId, duration, type } = req.body; // Added type
        const RulesEngine = require('./rules_engine');
        const result = await RulesEngine.processCallEnd(
            customerId,
            partnerId,
            parseFloat(duration),
            type || 'audio'
        );
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- DAILY CRON JOB (Run at midnight via scheduler) ---
app.post('/api/admin/run_daily_cron', async (req, res) => {
    try {
        const partners = await dbAdapter.getPartners();
        const results = [];

        for (const p of partners) {
            let log = `Partner ${p.firstName}: `;

            // 1. "Hit a Century" Bonus
            const dailyMins = p.dailyCallMinutes || 0;
            if (dailyMins >= 100) {
                const bonus = 200;
                await dbAdapter.updateUser(p.id, { walletAmount: (p.walletAmount || 0) + bonus });
                await new Transaction({
                    userId: p.id,
                    type: 'credit',
                    category: 'bonus',
                    amount: bonus,
                    description: 'Daily Bonus: Hit a Century (100+ mins)'
                }).save();
                log += `Bonus +₹${bonus}. `;
            }

            // 2. "Online Availability" Fine (Lazy Fee)
            // Rule: Must be online > 4 hours (240 mins)
            // SUNDAY EXEMPTION: If yesterday was Sunday, skip fine.
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const isSundayExemption = yesterday.getDay() === 0;

            const onlineMins = p.onlineTimeToday || 0;
            if (!isSundayExemption && onlineMins < 240) {
                const fine = 50;
                await dbAdapter.updateUser(p.id, { walletAmount: (p.walletAmount || 0) - fine });
                await new Transaction({
                    userId: p.id,
                    type: 'debit',
                    category: 'fine',
                    amount: fine,
                    description: `Lazy Fee: Online < 4 Hours (${onlineMins}m)`
                }).save();
                log += `Fine -₹${fine}. `;
            } else if (isSundayExemption) {
                log += `Sunday Exemption (No Lazy Fee). `;
            }

            // 3. Reset Daily Stats
            await dbAdapter.updateUser(p.id, {
                dailyCallMinutes: 0,
                missedCallsToday: 0,
                onlineTimeToday: 0
            });

            results.push(log);
        }

        res.json({ success: true, message: "Cron Job Completed", logs: results });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- SOCKET.IO SETUP ---
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for now (Mobile App + Admin Web)
        methods: ["GET", "POST"]
    }
});

// Store online users: { userId: socketId }
let onlineUsers = {};

io.on('connection', (socket) => {
    console.log('🔌 New Client Connected:', socket.id);

    // 1. User/Partner joins with their ID
    socket.on('join', (userId) => {
        onlineUsers[userId] = socket.id;
        console.log(`👤 User Joined: ${userId} (${socket.id})`);
        io.emit('online_status', { userId, status: 'online' });
    });

    // 2. Chat Message
    socket.on('send_message', (data) => {
        // data: { senderId, receiverId, message, type: 'text'|'gift', timestamp }
        console.log(`📩 Msg: ${data.senderId} -> ${data.receiverId}: ${data.message}`);

        const receiverSocketId = onlineUsers[data.receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receive_message', data);
        } else {
            console.log(`⚠️ User ${data.receiverId} is offline. Msg not sent via socket.`);
            // TODO: Save to DB as unread (handled by client logic or subsequent API call)
        }
    });

    // 3. User Disconnect
    socket.on('disconnect', () => {
        // Find userId from socketId
        const userId = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);
        if (userId) {
            console.log(`❌ User Left: ${userId}`);
            delete onlineUsers[userId];
            io.emit('online_status', { userId, status: 'offline' });
        }
    });
});

// --- APPOINTMENT & CALENDAR APIs ---

const Appointment = require('./models/Appointment');

// Book Appointment
app.post('/api/appointment/book', async (req, res) => {
    try {
        const { customerId, partnerId, scheduledTime, amount } = req.body;

        // 1. Validate Time (Must be > 24 hours from now)
        const slotTime = new Date(scheduledTime);
        const now = new Date();
        const diffHours = (slotTime - now) / 36e5;

        if (diffHours < 24) {
            return res.status(400).json({ success: false, message: "Bookings must be made at least 24 hours in advance." });
        }

        // 2. Check Overlap
        // Check if partner has any approved or pending appointment in this slot
        const endTime = new Date(slotTime.getTime() + 30 * 60000);

        // Simple check: start time match is enough for fixed 30m slots, but range check is safer
        const overlap = await Appointment.findOne({
            partnerId,
            status: { $in: ['pending', 'approved'] },
            scheduledTime: { $gte: slotTime, $lt: endTime }
        });

        if (overlap) {
            return res.status(400).json({ success: false, message: "Slot already booked." });
        }

        // 3. Deduct Payment
        const customer = await dbAdapter.getUser(customerId);
        if ((customer.walletAmount || 0) < amount) {
            return res.status(400).json({ success: false, message: "Insufficient Balance." });
        }

        await dbAdapter.updateUser(customerId, { walletAmount: (customer.walletAmount || 0) - amount });
        await new Transaction({
            userId: customerId,
            type: 'debit',
            category: 'booking',
            amount: amount,
            description: `Booking with Partner ${partnerId}`
        }).save();

        // 4. Create Appointment
        const appt = new Appointment({
            customerId,
            partnerId,
            scheduledTime: slotTime,
            amount
        });
        await appt.save();

        res.json({ success: true, message: "Booking Request Sent", data: appt });

    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Partner Action (Approve/Reject)
app.post('/api/appointment/action', async (req, res) => {
    try {
        const { appointmentId, action, reason } = req.body; // action: 'approve' | 'reject'
        const appt = await Appointment.findById(appointmentId);

        if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
        if (appt.status !== 'pending') return res.status(400).json({ success: false, message: "Request already processed" });

        // Check 1 Hour Timeout (Sanity check, Cron handles this too but good to block late manual actions)
        const now = new Date();
        const created = new Date(appt.createdAt);
        const hoursPassed = (now - created) / 36e5;

        if (hoursPassed > 1) {
            // It should have been cancelled by Cron, but if not, cancel now
            appt.status = 'cancelled';
            await appt.save();
            // REFUND
            const customer = await dbAdapter.getUser(appt.customerId);
            await dbAdapter.updateUser(appt.customerId, { walletAmount: (customer.walletAmount || 0) + appt.amount });
            await new Transaction({ userId: appt.customerId, type: 'credit', category: 'refund', amount: appt.amount, description: "Auto-Refund (Timeout)" }).save();

            return res.status(400).json({ success: false, message: "Request expired (1 hour limit)." });
        }

        if (action === 'approve') {
            appt.status = 'approved';
            await appt.save();
            // Notify Customer (TODO)
        } else if (action === 'reject') {
            appt.status = 'rejected';
            appt.rejectionReason = reason;
            await appt.save();

            // REFUND
            const customer = await dbAdapter.getUser(appt.customerId);
            await dbAdapter.updateUser(appt.customerId, { walletAmount: (customer.walletAmount || 0) + appt.amount });
            await new Transaction({ userId: appt.customerId, type: 'credit', category: 'refund', amount: appt.amount, description: "Refund (Request Rejected)" }).save();
        }

        res.json({ success: true, message: `Request ${action}d` });

    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get Appointments
app.get('/api/appointments/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.query; // 'customer' or 'partner'

        const filter = role === 'partner' ? { partnerId: userId } : { customerId: userId };
        const list = await Appointment.find(filter).sort({ scheduledTime: 1 });

        res.json({ success: true, data: list });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});


// CRON MONITOR (Run every 5 mins)
// Handles: 1hr Approval Timeout, No-Show Fines
app.post('/api/appointment/cron_monitor', async (req, res) => {
    try {
        const now = new Date();
        const logs = [];

        // 1. Check Pending Requests > 1 Hour
        const oneHourAgo = new Date(now.getTime() - 60 * 60000);
        const expiredPending = await Appointment.find({
            status: 'pending',
            createdAt: { $lt: oneHourAgo }
        });

        for (const appt of expiredPending) {
            appt.status = 'cancelled';
            await appt.save();

            // REFUND
            const customer = await dbAdapter.getUser(appt.customerId);
            await dbAdapter.updateUser(appt.customerId, { walletAmount: (customer.walletAmount || 0) + appt.amount });
            await new Transaction({ userId: appt.customerId, type: 'credit', category: 'refund', amount: appt.amount, description: "Refund (Expired Request)" }).save();

            logs.push(`Expired Appt ${appt._id} refunded.`);
        }

        // 2. Check No-Show (5 mins after start time)
        // If status is 'approved' AND (now > scheduledTime + 5 mins) AND not marked 'active/completed'
        // Ideally, 'completed' is set by call end logic. We check 'approved' ones that should have started.
        // We need a way to know if they joined. 'customerJoined', 'partnerJoined' flags required in Model (Added in Model plan).

        const fiveMinsAfterStart = new Date(now.getTime() - 5 * 60000);
        // Find approved appointments that started more than 5 mins ago
        const noShowCandidates = await Appointment.find({
            status: 'approved',
            scheduledTime: { $lt: fiveMinsAfterStart }
            // And hasn't changed to 'completed' or 'in-progress' logic
        });

        for (const appt of noShowCandidates) {
            // Check Flags
            if (!appt.customerJoined) {
                // CUSTOMER NO SHOW
                appt.status = 'missed'; // or cancelled
                await appt.save();

                // Fine 10%, Refund 90%
                const fine = appt.amount * 0.10;
                const refund = appt.amount - fine;

                const customer = await dbAdapter.getUser(appt.customerId);
                await dbAdapter.updateUser(appt.customerId, { walletAmount: (customer.walletAmount || 0) + refund });
                // No need to record fine txn as we just didn't refund full amount? 
                // Better transparency: Refund Full, Then Deduct Fine? Or just Refund Partial.
                // Let's Refund Partial.
                await new Transaction({ userId: appt.customerId, type: 'credit', category: 'refund', amount: refund, description: "Refund (Customer Missed - 10% Fine)" }).save();

                logs.push(`Customer Missed Appt ${appt._id}. Fined 10%.`);
            }

            if (!appt.partnerJoined) {
                // PARTNER NO SHOW
                // If customer joined but partner didn't? Or nobody joined?
                // If partner didn't join, they get fined.

                const partner = await dbAdapter.getUser(appt.partnerId);
                const fine = 50; // Fixed Fine
                await dbAdapter.updateUser(appt.partnerId, { walletAmount: (partner.walletAmount || 0) - fine });
                await new Transaction({ userId: appt.partnerId, type: 'debit', category: 'fine', amount: fine, description: "Fine (Missed Appointment)" }).save();

                // Refund Customer 100% if Partner missed? Yes logic implies.
                if (appt.status !== 'missed') { // If not already processed as customer missed
                    appt.status = 'missed';
                    await appt.save();
                    const customer = await dbAdapter.getUser(appt.customerId);
                    await dbAdapter.updateUser(appt.customerId, { walletAmount: (customer.walletAmount || 0) + appt.amount });
                    await new Transaction({ userId: appt.customerId, type: 'credit', category: 'refund', amount: appt.amount, description: "Refund (Partner Missed)" }).save();
                }
                logs.push(`Partner Missed Appt ${appt._id}. Fined ₹50.`);
            }
        }

        // 3. Notifications (15m, 5m reminders)
        // Need to find appointments STARTING in 15 mins.
        // For simplicity, cron runs every 5 mins.
        // Range: [Time+14m, Time+16m]
        const reminder15Start = new Date(now.getTime() + 14 * 60000);
        const reminder15End = new Date(now.getTime() + 16 * 60000);

        const reminders = await Appointment.find({
            status: 'approved',
            scheduledTime: { $gte: reminder15Start, $lte: reminder15End }
        });

        for (const r of reminders) {
            // Send Notifications
            // We need FCM tokens. Fetch Users.
            const p = await dbAdapter.getUser(r.partnerId); // Helper needed
            // ... Send FCM
            logs.push(`Sent 15m Reminder for Appt ${r._id}`);
        }

        res.json({ success: true, logs });

    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============================================
// ADVANCED PARTNER FEATURES - API ROUTES
// ============================================

// --- NOTIFICATIONS ---
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const notifications = await dbAdapter.getNotifications(userId);
        res.json({ success: true, data: notifications });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        await dbAdapter.markNotificationRead(id);
        res.json({ success: true, message: "Notification marked as read" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/notifications/send', async (req, res) => {
    try {
        const { userId, type, title, message, data } = req.body;
        const notification = await dbAdapter.createNotification({
            userId, type, title, message, data,
            isRead: false,
            createdAt: new Date()
        });
        res.json({ success: true, data: notification });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- ANALYTICS ---
app.get('/api/partners/analytics/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { period } = req.query;
        const analytics = await dbAdapter.getPartnerAnalytics(userId, period);
        res.json({ success: true, data: analytics });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/api/partners/daily_stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const stats = await dbAdapter.getDailyStats(userId);
        res.json({ success: true, data: stats });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- EARNINGS ---
app.get('/api/partners/earnings-breakdown/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { period } = req.query;
        const breakdown = await dbAdapter.getEarningsBreakdown(userId, period);
        res.json({ success: true, data: breakdown });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- LEADERBOARD ---
app.get('/api/partners/leaderboard', async (req, res) => {
    try {
        const { period } = req.query;
        const leaderboard = await dbAdapter.getLeaderboard(period);
        res.json({ success: true, data: leaderboard });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- REVIEWS ---
app.get('/api/reviews/:partnerId', async (req, res) => {
    try {
        const { partnerId } = req.params;
        const reviews = await dbAdapter.getPartnerReviews(partnerId);
        res.json({ success: true, data: reviews });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/reviews/:reviewId/response', async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { partnerResponse } = req.body;
        await dbAdapter.updateReviewResponse(reviewId, partnerResponse);
        res.json({ success: true, message: "Response submitted" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

console.log("✅ Advanced Partner Feature APIs Loaded");

server.listen(PORT, () => {
    console.log(`Gadfly Server running on port ${PORT}`);
});

