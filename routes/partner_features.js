// ============================================
// ADVANCED PARTNER FEATURES - API ROUTES
// ============================================

// Add these routes to server.js after existing routes

// --- NOTIFICATIONS ---

// Get User Notifications
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const notifications = await dbAdapter.getNotifications(userId);
        res.json({ success: true, data: notifications });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Mark Notification as Read
app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        await dbAdapter.markNotificationRead(id);
        res.json({ success: true, message: "Notification marked as read" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Send Notification (Internal/Cron)
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

// Get Partner Analytics
app.get('/api/partners/analytics/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { period } = req.query; // weekly, monthly

        const analytics = await dbAdapter.getPartnerAnalytics(userId, period);
        res.json({ success: true, data: analytics });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get Daily Stats
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

// Get Earnings Breakdown
app.get('/api/partners/earnings-breakdown/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { period } = req.query; // daily, weekly, monthly

        const breakdown = await dbAdapter.getEarningsBreakdown(userId, period);
        res.json({ success: true, data: breakdown });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- LEADERBOARD ---

// Get Leaderboard
app.get('/api/partners/leaderboard', async (req, res) => {
    try {
        const { period } = req.query; // daily, weekly, monthly
        const leaderboard = await dbAdapter.getLeaderboard(period);
        res.json({ success: true, data: leaderboard });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- REVIEWS ---

// Get Partner Reviews
app.get('/api/reviews/:partnerId', async (req, res) => {
    try {
        const { partnerId } = req.params;
        const reviews = await dbAdapter.getPartnerReviews(partnerId);
        res.json({ success: true, data: reviews });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Respond to Review
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

// --- HEARTBEAT (Already exists, but documenting) ---
app.post('/api/user/heartbeat', async (req, res) => {
    try {
        const { userId } = req.body;
        await dbAdapter.recordHeartbeat(userId);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- CALL END V2 (Already exists, but documenting) ---
app.post('/api/call/end', async (req, res) => {
    try {
        const { customerId, partnerId, duration, type, endedBy } = req.body;
        const result = await dbAdapter.processCallEnd({
            customerId, partnerId, duration, type, endedBy
        });
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = app; // Export for testing
