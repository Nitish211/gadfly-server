const mongoose = require('mongoose');
require('dotenv').config();

console.log("Starting DB Connection Test...");
console.log("URI:", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB Connected Successfully!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ MongoDB Connection Failed:", err.message);
        process.exit(1);
    });
