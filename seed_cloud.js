require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// Arrays for generating random realistic data
const firstNames = [
    "Aarohi", "Priya", "Nisha", "Kiara", "Riya", "Meera", "Sara", "Tina", "Zara", "Ananya",
    "Ishita", "Kavya", "Mira", "Neha", "Pooja", "Roshni", "Sanya", "Tanvi", "Urvi", "Vani"
];
const lastNames = [
    "Singh", "Verma", "Kapoor", "Patel", "Advani", "Roy", "Reddy", "Ali", "Dutta", "Khan",
    "Sharma", "Gupta", "Malhotra", "Joshi", "Mehta", "Chopra", "Desai", "Kumar", "Bhatia", "Saxena"
];
const locations = [
    "Delhi", "Mumbai", "Bangalore", "Kolkata", "Hyderabad", "Pune", "Chennai", "Jaipur", "Lucknow", "Goa"
];
const languages = ["Hindi", "English", "Punjabi", "Bengali", "Telugu", "Marathi", "Gujarati", "Urdu"];
const interests = ["Travel", "Music", "Yoga", "Reading", "Cooking", "Dancing", "Fashion", "Art", "Movies", "Fitness"];

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSubarray(arr, size) {
    const shuffled = arr.slice(0);
    let i = arr.length;
    let min = i - size;
    let temp, index;
    while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(min);
}

async function seed() {
    if (!process.env.MONGODB_URI) {
        console.error("❌ MONGODB_URI is missing in .env");
        process.exit(1);
    }

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected.");

        // Clean up ONLY partners to ensure we have a fresh set of 20
        await User.deleteMany({ role: 'partner' });
        console.log("🧹 Cleared existing Partners.");

        const newPartners = [];

        // Realistic Indian Names & Locations
        // const firstNames = [...] (Reusing existing arrays from top of file)

        for (let i = 0; i < 10; i++) {
            const firstName = firstNames[i];
            const lastName = getRandom(lastNames);
            const profilePic = `https://randomuser.me/api/portraits/women/${i + 10}.jpg`;
            const isExpert = i < 3; // 3 Experts, 7 Normals

            const partner = {
                id: `mock_gen_${Date.now()}_${i}`,
                firstName: firstName,
                lastName: lastName,
                profilePic: profilePic,
                role: 'partner',
                partnerRole: isExpert ? 'expert' : 'normal',
                currentStatus: Math.random() > 0.3 ? 'online' : 'busy',

                // NEW VERIFICATION FIELDS
                isVerified: true, // Legacy boolean
                verificationStatus: 'verified', // New Enum (verified by default for seed)
                voiceUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Dummy Audio

                gender: 'Female',
                mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
                languages: getRandomSubarray(languages, 2),
                interests: getRandomSubarray(interests, 3),
                expertise: isExpert ? getRandomSubarray(interests, 1) : ["Music"],
                location: getRandom(locations),

                walletAmount: 0,
                audioCallRate: isExpert ? 50 : 20,
                chatRate: isExpert ? 20 : 10,
                likes: [],
                averageRating: (3.5 + Math.random() * 1.5).toFixed(1),
                startedAt: new Date(),
                createdAt: new Date(),
                emplid: `EMP${100 + i}`,
                isBlocked: false,
                about: "Hi, I am a new verified partner on Gadfly!",
                images: [profilePic]
            };
            newPartners.push(partner);
        }

        await User.insertMany(newPartners);
        console.log(`✅ Successfully inserted ${newPartners.length} new Female Partners.`);

        process.exit(0);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
}

seed();
