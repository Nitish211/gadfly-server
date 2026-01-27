require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function verify() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.log("❌ NO MONGODB_URI in ENV!");
        process.exit(1);
    }

    try {
        console.log("Connecting to Cloud DB...");
        await mongoose.connect(uri);
        console.log("✅ Connected.");

        const experts = await User.find({ role: 'partner', partnerRole: 'expert' });
        const normals = await User.find({ role: 'partner', partnerRole: 'normal' });
        const allPartners = await User.find({ role: 'partner' });

        console.log(`\n📊 DATA VERIFICATION REPORT:`);
        console.log(`-----------------------------`);
        console.log(`Total Partners in DB: ${allPartners.length}`);
        console.log(`Experts Found:        ${experts.length}`);
        console.log(`Normals Found:        ${normals.length}`);
        console.log(`-----------------------------`);

        if (experts.length > 0) {
            console.log("\nSample Expert:", experts[0].firstName, `(Role: ${experts[0].partnerRole})`);
        }
        if (normals.length > 0) {
            console.log("Sample Normal:", normals[0].firstName, `(Role: ${normals[0].partnerRole})`);
        }

        if (experts.length === 0 || normals.length === 0) {
            console.log("\n❌ FAIL: Missing data for one category!");
        } else {
            console.log("\n✅ SUCCESS: Data is correctly separated in DB.");
        }

        process.exit(0);

    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

verify();
