require('dotenv').config();
const mongoose = require('mongoose');
const dbAdapter = require('./db_adapter');

async function test() {
    if (!process.env.MONGODB_URI) {
        console.log("No Mongo URI");
        return;
    }
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Testing getPartners('expert')...");
    // simulate server call: search=undefined, includeBlocked=undefined, partnerRole='expert'
    const results = await dbAdapter.getPartners(undefined, undefined, 'expert');

    console.log(`Count: ${results.length}`);
    results.slice(0, 5).forEach(u => console.log(`${u.firstName}: ${u.partnerRole}`));

    // Check for leak
    const normals = results.filter(u => u.partnerRole === 'normal');
    if (normals.length > 0) {
        console.log("❌ FAIL: Found Normals in Expert result!");
    } else {
        console.log("✅ SUCCESS: Only Experts found.");
    }

    process.exit(0);
}

test();
