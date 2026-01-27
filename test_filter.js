const http = require('http');

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) { resolve(data); }
            });
        }).on('error', reject);
    });
}

async function test() {
    try {
        console.log("Testing Normal...");
        const normal = await get('http://localhost:3000/api/user?role=partner&partnerRole=normal');
        console.log("Normal Data Type:", typeof normal);
        if (normal.data) {
            console.log("Normal Count:", normal.data.length);
            if (normal.data.length > 0) console.log("Sample:", normal.data[0].firstName, "| Role:", normal.data[0].partnerRole);
        } else {
            console.log("Normal Response invalid:", normal);
        }

        console.log("\nTesting Expert...");
        const expert = await get('http://localhost:3000/api/user?role=partner&partnerRole=expert');
        if (expert.data) {
            console.log("Expert Count:", expert.data.length);
            if (expert.data.length > 0) console.log("Sample:", expert.data[0].firstName, "| Role:", expert.data[0].partnerRole);
        }

    } catch (e) {
        console.error("Test Failed:", e.message);
    }
}

// Wait 5s for server to possibly start
setTimeout(test, 5000);
