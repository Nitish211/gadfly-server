const fs = require('fs');
const path = require('path');
const User = require('./models/User');
const Gift = require('./models/Gift');

const DB_FILE = path.join(__dirname, 'db.json');

// --- LOCAL DB HELPERS ---
const readLocalDb = () => {
    try {
        if (!fs.existsSync(DB_FILE)) return { partners: [], customers: [], gifts: [] };
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) { return { partners: [], customers: [], gifts: [] }; }
};

const writeLocalDb = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- ADAPTER ---
const isMongo = () => mongoose.connection.readyState === 1;
const mongoose = require('mongoose');

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
    getPartners: async (queryStr, includeBlocked) => {
        if (isMongo()) {
            let filter = { role: 'partner' };
            if (includeBlocked !== 'true') filter.isBlocked = false;
            if (queryStr) {
                const regex = new RegExp(queryStr, 'i');
                filter.$or = [{ firstName: regex }, { lastName: regex }, { emplid: regex }];
            }
            return await User.find(filter);
        } else {
            const db = readLocalDb();
            let partners = db.partners;
            if (includeBlocked !== 'true') partners = partners.filter(p => !p.isBlocked);
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
    }
};
