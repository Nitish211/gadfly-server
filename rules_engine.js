const Transaction = require('./models/Transaction');
const dbAdapter = require('./db_adapter');
const Interaction = require('./models/Interaction');

const RulesEngine = {
    // 0. Configuration: Rate Cards (Official V10)
    // Audio Rate Slabs (Partner Earning per Minute)
    audioSlabs: {
        'basic': [{ max: 1, rate: 0.5 }, { max: 10, rate: 1.5 }, { max: 20, rate: 2.0 }, { max: 40, rate: 2.5 }, { max: 60, rate: 3.0 }, { max: 9999, rate: 3.5 }],
        'pro': [{ max: 1, rate: 1.0 }, { max: 10, rate: 2.0 }, { max: 20, rate: 2.5 }, { max: 40, rate: 3.0 }, { max: 60, rate: 3.5 }, { max: 9999, rate: 4.0 }],
        'expert': [{ max: 1, rate: 1.5 }, { max: 10, rate: 2.5 }, { max: 20, rate: 3.0 }, { max: 40, rate: 3.5 }, { max: 60, rate: 4.0 }, { max: 9999, rate: 5.0 }]
    },
    // Video Rate Slabs
    videoSlabs: {
        'basic': [{ max: 1, rate: 2.0 }, { max: 10, rate: 3.0 }, { max: 20, rate: 3.5 }, { max: 40, rate: 4.0 }, { max: 60, rate: 4.5 }, { max: 9999, rate: 5.0 }],
        'pro': [{ max: 1, rate: 4.0 }, { max: 10, rate: 6.0 }, { max: 20, rate: 7.0 }, { max: 40, rate: 8.0 }, { max: 60, rate: 8.5 }, { max: 9999, rate: 9.0 }],
        'expert': [{ max: 1, rate: 9.0 }, { max: 10, rate: 11.0 }, { max: 20, rate: 12.0 }, { max: 40, rate: 13.0 }, { max: 60, rate: 13.5 }, { max: 9999, rate: 14.0 }]
    },
    // Customer Pricing (Flat Rate per Minute)
    customerPrice: {
        'basic': { audio: 6, video: 20 },
        'pro': { audio: 8, video: 40 },
        'expert': { audio: 10, video: 60 }
    },

    // Helper: Calculate Earning based on Duration & Tier
    calculateSlabEarning: (durationMinutes, tier, type = 'audio') => {
        let totalEarning = 0;
        const slabs = type === 'video' ? RulesEngine.videoSlabs[tier] : RulesEngine.audioSlabs[tier];

        // Iterate minute by minute
        for (let m = 1; m <= Math.ceil(durationMinutes); m++) {
            // Find applicable rate for this specific minute 'm'
            const slab = slabs.find(s => m <= s.max) || slabs[slabs.length - 1];
            totalEarning += slab.rate;
        }
        return totalEarning;
    },

    // 1. Process Call End (Financials & Logic)
    processCallEnd: async (customerId, partnerId, durationMinutes, type = 'audio', endedBy = 'unknown') => {
        try {
            const customer = await dbAdapter.getUser(customerId);
            const partner = await dbAdapter.getUser(partnerId);
            if (!customer || !partner) throw new Error("User not found");

            const tier = partner.partnerRole || 'basic'; // basic, pro, expert

            // A. Check New vs Old Interaction (BEFORE updating history)
            let isNewUser = true;
            let currentInteraction = null;
            if (process.env.MONGODB_URI) {
                currentInteraction = await Interaction.findOne({ partnerId, customerId });
                if (currentInteraction && currentInteraction.totalDuration > 60) {
                    isNewUser = false; // Already spoken > 1 min previously
                }
            } else {
                // Local DB fallback (assume new if no complex logic available)
                isNewUser = true;
            }

            // B. Calculate Financials
            const customerRate = RulesEngine.customerPrice[tier][type] || 10;
            const callCost = Math.ceil(durationMinutes) * customerRate;

            // Check Probation (50% Cut)
            let partnerEarning = RulesEngine.calculateSlabEarning(durationMinutes, tier, type);
            if (partner.isProbation) {
                partnerEarning = partnerEarning * 0.50; // 50% Penalty
                console.log(`⚠️ Probation Mode: Earning halved for ${partner.firstName}`);
            }

            // C. Transaction: Debit Customer
            const newCustBal = (customer.walletAmount || 0) - callCost;
            await dbAdapter.updateUser(customerId, {
                walletAmount: newCustBal,
                totalCallMinutes: (customer.totalCallMinutes || 0) + durationMinutes
            });
            await new Transaction({
                userId: customerId, type: 'debit', category: 'call_cost', amount: callCost, relatedUserId: partnerId,
                description: `${type.toUpperCase()} Call (${durationMinutes}m)`
            }).save();

            // D. Transaction: Credit Partner
            const newPartBal = (partner.walletAmount || 0) + partnerEarning;
            const newTotalMins = (partner.totalCallMinutes || 0) + durationMinutes;
            const newDailyMins = (partner.dailyCallMinutes || 0) + durationMinutes;
            const newOnlineMins = (partner.onlineTimeToday || 0) + durationMinutes; // Add call time to online time

            await dbAdapter.updateUser(partnerId, {
                walletAmount: newPartBal,
                totalCallMinutes: newTotalMins,
                dailyCallMinutes: newDailyMins,
                onlineTimeToday: newOnlineMins
            });
            await new Transaction({
                userId: partnerId, type: 'credit', category: 'call_earning', amount: partnerEarning, relatedUserId: customerId,
                description: `${type.toUpperCase()} Call Earning (${durationMinutes}m)`
            }).save();

            // E. Update Interaction History
            if (process.env.MONGODB_URI) {
                if (currentInteraction) {
                    currentInteraction.totalDuration += (durationMinutes * 60);
                    currentInteraction.lastInteractionAt = new Date();
                    await currentInteraction.save();
                } else {
                    await new Interaction({
                        partnerId, customerId, totalDuration: (durationMinutes * 60)
                    }).save();
                }
            }

            // F. Handle Call Cut (Discipline)
            // If ended by Partner AND Duration < 1 Min -> Count as Cut
            if (endedBy === 'partner' && durationMinutes < 1.0) {
                await RulesEngine.handleCallCut(partnerId, isNewUser);
            }

            return { success: true, callCost, partnerEarning, isProbation: partner.isProbation };

        } catch (e) {
            console.error("RulesEngine Error:", e);
            throw e;
        }
    },

    // 2. Handle Call Cut (Discipline)
    handleCallCut: async (partnerId, isNewUser) => {
        return RulesEngine.applyDiscipline(partnerId, isNewUser, 'cut');
    },

    // 3. Handle Missed Call
    handleMissedCall: async (partnerId) => {
        // Determine New/Old is tricky for missed call since we don't know who called easily unless passed.
        // Assuming 'New' penalty for safety or Need callerId passed here.
        // For now, default to 'New' rate (Strict) or check logs if possible.
        // Let's assume standard penalty logic.
        return RulesEngine.applyDiscipline(partnerId, true, 'miss');
    },

    // 4. Shared Discipline Logic
    applyDiscipline: async (partnerId, isNewUser, type) => {
        // Sunday Exemption
        if (new Date().getDay() === 0) return { success: true, message: "Sunday Exemption" };

        const partner = await dbAdapter.getUser(partnerId);
        if (!partner) return;

        let dailyCounter = type === 'cut' ? (partner.dailyCallCuts || 0) + 1 : (partner.missedCallsToday || 0) + 1;

        // Update Counter
        const updateData = type === 'cut' ? { dailyCallCuts: dailyCounter } : { missedCallsToday: dailyCounter };
        await dbAdapter.updateUser(partnerId, updateData);

        // Fines (Start from 6th offense)
        let fine = 0;
        if (dailyCounter >= 6) {
            fine = isNewUser ? 10 : 5;

            await dbAdapter.updateUser(partnerId, { walletAmount: (partner.walletAmount || 0) - fine });
            await new Transaction({
                userId: partnerId, type: 'debit', category: 'fine', amount: fine,
                description: `${type === 'cut' ? 'Call Cut' : 'Missed Call'} Fine #${dailyCounter}`
            }).save();
        }

        // Block (10th Offense)
        if (dailyCounter >= 10) {
            await dbAdapter.updateUser(partnerId, { isBlocked: true, currentStatus: 'offline', blockReason: `Too many ${type}s` });
        }

        return { success: true, dailyCounter, fine, blocked: dailyCounter >= 10 };
    }
};

module.exports = RulesEngine;
