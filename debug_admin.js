const https = require('http'); // HTTP for localhost

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function run() {
    // 1. Get Users
    console.log("Fetching users...");
    const usersRes = await request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/user?role=partner',
        method: 'GET'
    });

    if (usersRes.status !== 200) {
        console.error("Failed to list users:", usersRes.status, usersRes.body);
        return;
    }

    let users;
    try {
        users = JSON.parse(usersRes.body).data;
    } catch (e) {
        console.error("Invalid JSON from List:", usersRes.body);
        return;
    }

    if (!users || users.length === 0) {
        console.error("No users found to update.");
        return;
    }

    const targetUser = users[0];
    console.log(`Targeting User: ${targetUser.firstName} (${targetUser.id})`);

    // 2. Update User
    const payload = JSON.stringify({
        id: targetUser.id,
        firstName: targetUser.firstName + "_EDIT",
        partnerRole: "normal"
    });

    console.log("Sending Update...");
    const updateRes = await request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/input_update_partner',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length
        }
    }, payload);

    console.log("\n--- UPDATE RESPONSE ---");
    console.log("Status:", updateRes.status);
    console.log("Body:", updateRes.body);
}

run();
