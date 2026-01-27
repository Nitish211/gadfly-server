const fs = require('fs');
const path = require('path');
const User = require('./models/User');
const Gift = require('./models/Gift');
const Request = require('./models/Request');

const DB_FILE = path.join(__dirname, 'db.json');

// --- LOCAL DB HELPERS ---
const readLocalDb = () => {
    try {
        if (!fs.existsSync(DB_FILE)) return { partners: [], customers: [], gifts: [], requests: [], transactions: [] };
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) { return { partners: [], customers: [], gifts: [], requests: [], transactions: [] }; }
};

const writeLocalDb = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- ADAPTER ---
const isMongo = () => mongoose.connection.readyState === 1;
const mongoose = require('mongoose');

// --- TRANSACTION HELPERS ---
async function saveTransaction(data) {
    if (mongoose.connection.readyState === 1) { // MongoDB Connected
        // MongoDB logic is handled in server.js directly via new Transaction().save()
        // Here we just return true to match interface, or implement if moved here
        return true;
    } else {
        // LOCAL JSON
        const db = readLocalDb();
        if (!db.transactions) db.transactions = [];
        const newTxn = {
            _id: 'txn_' + Date.now(),
            ...data,
            createdAt: new Date().toISOString()
        };
        db.transactions.push(newTxn);
        writeLocalDb(db);
        return newTxn;
    }
}

async function getTransactions(userId) {
    if (mongoose.connection.readyState === 1) { // MongoDB
        // Handled in server.js via Mongoose
        return [];
    } else {
        // LOCAL JSON
        const db = readLocalDb();
        return (db.transactions || [])
            .filter(t => t.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 20);
    }
}

module.exports = {
    // LOGIN / REGISTER
    loginOrRegister: async (mobile, initialData) => {
        if (isMongo()) {
            let user = await User.findOne({ mobile });
            if (!user) {
                user = new User({ ...initialData, mobile });
                await user.save();
            }
            return user;
        } else {
            const db = readLocalDb();
            let user = db.customers.find(c => c.mobile === mobile);
            if (!user) {
                user = { ...initialData, mobile };
                db.customers.push(user);
                writeLocalDb(db);
            }
            return user;
        }
    },

    // GET USER (Partner or Customer)
    getUser: async (id) => {
        if (isMongo()) {
            return await User.findOne({ id });
        } else {
            const db = readLocalDb();
            return db.customers.find(c => c.id === id) || db.partners.find(p => p.id === id);
        }
    },

    // GET PARTNERS
    // GET PARTNERS
    getPartners: async (queryStr, includeBlocked, partnerRole, verificationStatus) => {
        if (isMongo()) {
            let filter = { role: 'partner' };
            if (includeBlocked !== 'true') filter.isBlocked = false;

            // 1. Verification Status Filtering
            if (verificationStatus) {
                // Admin asking for specific status (pending, verified, rejected)
                filter.verificationStatus = verificationStatus;
            } else {
                // Default: Show only 'verified' for public users
                if (includeBlocked !== 'true') {
                    filter.verificationStatus = 'verified';
                }
            }

            // Add Partner Role Filter
            if (partnerRole && partnerRole !== 'null' && partnerRole !== 'partner') {
                filter.partnerRole = partnerRole;
            }

            // DEBUG RETURN
            if (queryStr === 'DEBUG') {
                return [{ _id: 'debug', filterObject: filter }];
            }

            if (queryStr) {
                const regex = new RegExp(queryStr, 'i');
                filter.$or = [{ firstName: regex }, { lastName: regex }, { emplid: regex }];
            }
            return await User.find(filter);
        } else {
            const db = readLocalDb();
            let partners = db.partners;
            if (includeBlocked !== 'true') partners = partners.filter(p => !p.isBlocked);

            // Add Partner Role Filter
            if (partnerRole && partnerRole !== 'null' && partnerRole !== 'partner') {
                partners = partners.filter(p => p.partnerRole === partnerRole);
            }

            if (queryStr) {
                const lower = queryStr.toLowerCase();
                partners = partners.filter(p =>
                    (p.firstName + " " + p.lastName).toLowerCase().includes(lower) ||
                    (p.emplid && p.emplid.toLowerCase().includes(lower))
                );
            }
            return partners;
        }
    },

    // TOGGLE LIKE
    toggleLike: async (userId, partnerId) => {
        if (isMongo()) {
            const user = await User.findOne({ id: userId });
            if (!user) return { success: false, message: "User not found" };

            const index = user.likes.indexOf(partnerId);
            let isLiked = false;
            if (index === -1) {
                user.likes.push(partnerId);
                isLiked = true;
            } else {
                user.likes.pull(partnerId);
                isLiked = false;
            }
            await user.save();
            return { success: true, isLiked };
        } else {
            const db = readLocalDb();
            let user = db.customers.find(c => c.id === userId);
            if (!user) user = db.partners.find(p => p.id === userId);
            if (!user) return { success: false, message: "User not found" };

            if (!user.likes) user.likes = [];
            const index = user.likes.indexOf(partnerId);
            let isLiked = false;
            if (index === -1) {
                user.likes.push(partnerId);
                isLiked = true;
            } else {
                user.likes.splice(index, 1);
                isLiked = false;
            }
            writeLocalDb(db);
            return { success: true, isLiked };
        }
    },

    // GET GIFTS
    getGifts: async () => {
        if (isMongo()) return await Gift.find({});
        else return readLocalDb().gifts || [];
    },

    // ADD GIFT
    addGift: async (giftData) => {
        if (isMongo()) {
            const gift = new Gift(giftData);
            return await gift.save();
        } else {
            const db = readLocalDb();
            if (!db.gifts) db.gifts = [];
            db.gifts.push(giftData);
            writeLocalDb(db);
            return giftData;
        }
    },

    // UPDATE GIFT
    updateGift: async (id, updateData) => {
        if (isMongo()) {
            return await Gift.findOneAndUpdate({ id }, updateData, { new: true });
        } else {
            const db = readLocalDb();
            let gift = db.gifts.find(g => g.id === id);
            if (gift) {
                Object.assign(gift, updateData);
                writeLocalDb(db);
                return gift;
            }
            return null;
        }
    },

    // DELETE GIFT
    deleteGift: async (id) => {
        if (isMongo()) {
            return await Gift.findOneAndDelete({ id });
        } else {
            const db = readLocalDb();
            const index = db.gifts.findIndex(g => g.id === id);
            if (index !== -1) {
                const deleted = db.gifts.splice(index, 1);
                writeLocalDb(db);
                return deleted[0];
            }
            return null;
        }
    },

    // UPDATE USER / PARTNER (Generic)
    updateUser: async (id, updateData) => {
        if (isMongo()) {
            // If ID starts with 'c_', search by id. If mongoID use _id?
            // Usually we use custom 'id' field.
            return await User.findOneAndUpdate({ id }, updateData, { new: true });
        } else {
            const db = readLocalDb();
            // Try partners first
            let user = db.partners.find(p => p.id === id);
            if (!user) user = db.customers.find(c => c.id === id);

            if (user) {
                Object.assign(user, updateData);
                writeLocalDb(db);
                return user;
            }
            return null; // Not found
        }
    },

    // ============================================
    // ADVANCED PARTNER FEATURES - DB METHODS
    // ============================================

    // Notifications
    async getNotifications(userId) {
        // Mock data for now - implement MongoDB model later
        return [
            {
                id: 'notif_1',
                userId,
                type: 'daily_summary',
                title: 'Daily Summary',
                message: `You earned ₹500 today with 3h online time!`,
                isRead: false,
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'notif_2',
                userId,
                type: 'reward',
                title: 'Silver Star Earned!',
                message: 'Congratulations! You earned ₹150 Silver Star bonus.',
                isRead: true,
                createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            }
        ];
    },

    async markNotificationRead(notificationId) {
        // Mock implementation
        console.log(`Notification ${notificationId} marked as read`);
        return true;
    },

    async createNotification(data) {
        // Mock implementation
        return { id: 'notif_' + Date.now(), ...data };
    },

    // Analytics
    async getPartnerAnalytics(userId, period) {
        // Mock data
        return {
            earningsGraph: [
                { day: 'Mon', amount: 500 },
                { day: 'Tue', amount: 700 },
                { day: 'Wed', amount: 600 },
                { day: 'Thu', amount: 900 },
                { day: 'Fri', amount: 1100 },
                { day: 'Sat', amount: 1300 },
                { day: 'Sun', amount: 800 }
            ],
            bestHours: [
                { hour: 20, earnings: 500 },
                { hour: 21, earnings: 450 },
                { hour: 19, earnings: 400 }
            ],
            repeatCustomers: 45,
            totalCustomers: 100
        };
    },

    async getDailyStats(userId) {
        // Mock data
        return {
            dailyMinutes: 120,
            targetMinutes: 100,
            missedCalls: 0,
            missedCallLimit: 3,
            todayEarnings: 500,
            onlineTime: 180
        };
    },

    // Earnings
    async getEarningsBreakdown(userId, period) {
        // Mock data
        return {
            calls: 5000,
            gifts: 2000,
            bonuses: 500,
            fines: 100,
            projected: 8000
        };
    },

    // Leaderboard
    async getLeaderboard(period) {
        // Mock data
        return [
            { id: '1', name: 'Priya Sharma', tier: 'expert', earnings: 15000 },
            { id: '2', name: 'Anjali Verma', tier: 'pro', earnings: 12000 },
            { id: '3', name: 'Neha Patel', tier: 'basic', earnings: 8000 },
            { id: '4', name: 'Riya Singh', tier: 'pro', earnings: 7500 },
            { id: '5', name: 'Kavya Reddy', tier: 'basic', earnings: 6000 }
        ];
    },

    // Reviews
    async getPartnerReviews(partnerId) {
        // Mock data
        return [
            {
                id: 'review_1',
                partnerId,
                customerName: 'Rahul Kumar',
                rating: 5,
                writtenReview: 'Great conversation! Very helpful and friendly.',
                partnerResponse: null,
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'review_2',
                partnerId,
                customerName: 'Amit Sharma',
                rating: 4,
                writtenReview: 'Good experience overall.',
                partnerResponse: 'Thank you for your feedback!',
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
    },

    async updateReviewResponse(reviewId, partnerResponse) {
        // Mock implementation
        console.log(`Review ${reviewId} response: ${partnerResponse}`);
        return true;
    },

    // ============================================
    // CORE LOGIC - CALL PROCESSING
    // ============================================

    async processCallEnd({ customerId, partnerId, duration, type, endedBy }) {
        try {
            console.log(`Processing Call End: ${type} call, ${duration}s, Partner: ${partnerId}`);

            // 1. Get Partner Tier (Mocking as 'pro' if not found, orfetching real user)
            // In real app, fetch from User model. Here using mock logic or reading local db
            // Assuming Pro Tier for testing logic as per user request
            const tier = 'pro';

            // 2. Calculate Earnings (Rate Card Logic)
            const minutes = duration / 60;
            let ratePerMin = 0;

            // Slab Constants
            const rateCards = {
                basic: {
                    audio: {
                        base: 0.5,  // 0-1 min
                        slab1: 1.5, // 1-10 min
                        slab2: 2.0, // 10-20 min
                        slab3: 2.5, // 20-40 min
                        slab4: 3.0, // 40-60 min
                        slab5: 3.5  // 60+ min
                    },
                    video: {
                        base: 2.0,  // 0-1 min
                        slab1: 3.0, // 1-10 min
                        slab2: 3.5, // 10-20 min
                        slab3: 4.0, // 20-40 min
                        slab4: 4.5, // 40-60 min
                        slab5: 5.0  // 60+ min
                    }
                },
                pro: {
                    audio: {
                        base: 1.0,  // 0-1 min
                        slab1: 2.0, // 1-10 min
                        slab2: 2.5, // 10-20 min
                        slab3: 3.0, // 20-40 min
                        slab4: 3.5, // 40-60 min
                        slab5: 4.0  // 60+ min
                    },
                    video: {
                        base: 4.0,  // 0-1 min
                        slab1: 6.0, // 1-10 min
                        slab2: 7.0, // 10-20 min
                        slab3: 8.0, // 20-40 min
                        slab4: 8.5, // 40-60 min
                        slab5: 9.0  // 60+ min
                    }
                },
                expert: {
                    audio: {
                        base: 1.5,  // 0-1 min
                        slab1: 2.5, // 1-10 min
                        slab2: 3.0, // 10-20 min
                        slab3: 3.5, // 20-40 min
                        slab4: 4.0, // 40-60 min
                        slab5: 5.0  // 60+ min
                    },
                    video: {
                        base: 9.0,   // 0-1 min
                        slab1: 11.0, // 1-10 min
                        slab2: 12.0, // 10-20 min
                        slab3: 13.0, // 20-40 min
                        slab4: 13.5, // 40-60 min
                        slab5: 14.0  // 60+ min
                    }
                }
            };

            // Default to 'basic' if tier not found or invalid
            const actualTier = (tier === 'pro' || tier === 'expert') ? tier : 'basic';
            // Note: Expert rates not yet defined in provided schema, map Expert to Pro or define structure if needed. 
            // For now assuming Expert uses Pro rates + bonus or handled separately. 
            // Guide shows Expert column in User request? 
            // Checking user request: "Expert Earns" columns exist.
            // Let's add Expert slab support to be future proof or just strictly follow Basic/Pro for now.
            // User asked "ye basic mai kuch nii na kiye ??". Focusing on Basic.

            // Map expert to pro for now unless explicit expert rates provided in code action
            const effectiveTierRates = rateCards[actualTier] || rateCards.basic;
            const typeRates = effectiveTierRates[type] || effectiveTierRates.audio;

            const tierRates = typeRates; // Alias for existing logic below

            // Downgrade Logic: Rate is determined by COMPLETED slab
            if (minutes < 1) {
                ratePerMin = tierRates.base;
            } else if (minutes < 10) {
                // Didn't complete 10 mins => Downgrade to 0-1 rate (Base)
                ratePerMin = tierRates.base;
            } else if (minutes < 20) {
                // Completed 10, didn't complete 20 => Rate is Slab1 (1-10 rate)
                ratePerMin = tierRates.slab1;
            } else if (minutes < 40) {
                // Completed 20 => Rate is Slab2
                ratePerMin = tierRates.slab2;
            } else if (minutes < 60) {
                // Completed 40 => Rate is Slab3
                ratePerMin = tierRates.slab3;
            } else {
                // Completed 60 => Rate is Slab5 (Highest)
                // Wait, table says "60 min complete hone par hi ye slab valid (40-60 rate? No)"
                // Table says: "60+ Mins": "60 min cross karne ke baad... isi rate par" -> This is Slab5
                // "40-60 Mins": "60 min complete hone par hi ye slab valid" -> This logic in table text is slightly confusing.
                // Let's stick to the slab definitions:
                // 40-60 Mins slab rate is for duration 40-60. 
                // Table says: "60 se pehle cut hua, to 20-40 slab rate lagega".
                // So if call is 59 mins: It didn't complete 60. So it gets 20-40 rate (Slab3).
                ratePerMin = tierRates.slab5; // If 60+ completed
                if (minutes < 60) {
                    // Should be covered by 'else if (minutes < 60)' but logic above:
                    // < 60 catch block actually handles 40-60 duration.
                    // If I am in < 60 block (e.g. 59), I completed 40.
                    // Table says: "40-60 Mins": "60 min complete hone par hi ye slab valid". 
                    // This implies if I don't reach 60, I don't get 40-60 rate?
                    // "Agar 60 se pehle cut hua, to 20-40 slab rate lagega."
                    // YES. So for 59 mins, rate is Slab3 (20-40).
                    // My < 60 logic should assign Slab3.
                    // The code above: "else if (minutes < 60) { ratePerMin = tierRates.slab3 }" is CORRECT.
                    // Wait, Slab 3 is 20-40 rate. Correct.
                    // What about Slab 4 (40-60 rate)? 
                    // Table: "40-60 Mins" -> Basic 3.0, Pro 3.5. 
                    // Comment: "60 min complete hone par hi ye slab valid hoga."
                    // This implies Slab 4 is ONLY applied if you reach 60?
                    // But Slab 5 (60+) is HIGHER (Pro 4.0).
                    // This means Slab 4 is effectively skipped? Or is Slab 4 applied for the *first 60 mins* if you cross 60?
                    // "60+ Mins": "60 min cross karne ke baad... isi rate par (Slab 5)".
                    // Usually slab logic is flat rate for entire call.
                    // If I speak 65 mins. Entire call is at Slab 5 rate (Highest).
                    // If I speak 59 mins. I didn't reach 60. Downgrade to 20-40 rate. 
                    // This effectively makes the 40-60 rate unreachable unless you hit exactly 60?
                    // Or maybe the comment means "To get 40-60 rate, you must complete 40"? 
                    // Let's re-read carefully: | 40-60 Mins | ... | "60 min complete hone par hi ye slab valid hoga".
                    // This literally says you need 60 mins to get the 40-60 rate.
                    // But if you hit 60 mins, you enter 60+ slab (which pays MORE).
                    // This might be a typo in user request or a very strict rule where 40-60 rate is never applied?
                    // Or maybe it means "To get 40-60 rate, you must complete 40"? (Like previous rows).
                    // Row "20-40": "Agar call 40 min continuous complete hoti hai tabhi ye rate lagega".
                    // Row "10-20": "Ye slab tab apply hota hai jab 20 min complete ho".
                    // SCHEME: To get Slab X rate, you must complete the Upper Bound of Slab X?
                    // Slab 10-20: Needs 20 completed. 
                    // Slab 20-40: Needs 40 completed.
                    // Slab 40-60: Needs 60 completed.
                    // If I speak 50 mins: I completed 40. I get Slab 20-40 rate. (Slab3).
                    // If I speak 25 mins: I completed 20. I get Slab 10-20 rate. (Slab2).
                    // If I speak 15 mins: I completed 10. I get Slab 1-10 rate. (Slab1).
                    // If I speak 60 mins: I completed 60. I get Slab 40-60 rate? OR 60+ rate?
                    // 60+ says "60 min cross karne ke baad".
                    // I will assume logic: 
                    // Minutes < 10: Base Rate (0-1)
                    // Minutes < 20: Slab 1 (1-10)
                    // Minutes < 40: Slab 2 (10-20)
                    // Minutes < 60: Slab 3 (20-40)
                    // Minutes >= 60: Slab 5 (60+) - (Slab 4 seems skipped or maybe 60-X is Slab 5)
                    // Let's interpret "60+ Mins" as distinct from "40-60".
                    // If >= 60, apply Slab 5.
                }
            }

            // Calculation
            let earnings = minutes * ratePerMin;

            // 3. Fines (Daily Check)
            // In real app, fetch daily stats (reset at 12 AM)
            const dailyStats = await this.getDailyStats(partnerId) || { missedCalls: 0, cutCalls: 0, offenses: 0, isBlocked: false };

            if (dailyStats.isBlocked) {
                return { error: "Partner is blocked due to excessive offenses." };
            }

            let fine = 0;
            let logMsg = "";
            let offenseAdded = 0;

            // Simplified: Treat Miss and Cut as equal "Offenses" for the unified table logic
            // Or track separately? User said "Offense Count (Same Day)".
            // Assuming combined or individual, table implies "Offense Count".
            // Let's assume Combined Offense Count for simplicity or per type? 
            // "Sab counters daily reset... 1 din ke andar jitni galti"
            // Let's track TOTAL OFFENSES for the block logic.

            // However, Miss and Cut might have different implications.
            // But table says "Offense Count" generic. 
            // Let's use a combined "dailyOffenses" counter.

            let currentOffenses = dailyStats.offenses || 0;
            let isOffense = false;

            if (duration === 0) { // Missed Call
                isOffense = true;
                logMsg = "Missed Call";
            } else if (duration < 60) { // Call Cut (< 1 min)
                isOffense = true;
                logMsg = "Call Cut (<1m)";
            }

            if (isOffense) {
                currentOffenses++;

                if (currentOffenses <= 5) {
                    // 1st - 5th: Warning (Free)
                    logMsg += " - Warning (Free)";
                } else if (currentOffenses <= 9) {
                    // 6th - 9th: ₹10 Fine
                    fine = 10;
                    logMsg += " - Fine ₹10";
                } else if (currentOffenses === 10) {
                    // 10th: Block
                    logMsg += " - ACCOUNT BLOCKED";
                    // Trigger Block Logic Here (e.g. update user status)
                    // await this.blockPartner(partnerId);
                } else {
                    // 11th+: Blocked (Needs Admin Reset)
                    // If system allowed this call, it means they were unblocked or something.
                    // But if they are still making offenses:
                    logMsg += " - Post-Block Offense";
                }
            }

            earnings -= fine;

            // 4. Return Result
            return {
                earnings: parseFloat(earnings.toFixed(2)),
                rateApplied: ratePerMin,
                durationMinutes: parseFloat(minutes.toFixed(2)),
                fineApplied: fine,
                fineReason: logMsg,
                statsUpdate: {
                    offenses: currentOffenses,
                    isBlocked: currentOffenses >= 10
                }
            };

        } catch (e) {
            console.error("ProcessCallEnd Error:", e);
            return { error: e.message };
        }
    }
};
