const https = require('https');

function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log("Status:", res.statusCode);
                try {
                    const json = JSON.parse(data);
                    console.log("Data Count:", json.data.length);
                    // Print first few roles
                    json.data.slice(0, 3).forEach(u => console.log(`${u.firstName}: ${u.partnerRole}`));

                    // Check if mixed
                    const experts = json.data.filter(u => u.partnerRole === 'expert');
                    const normals = json.data.filter(u => u.partnerRole === 'normal');
                    console.log(`Experts: ${experts.length}, Normals: ${normals.length}`);
                } catch (e) { console.log(data); }
            });
        }).on('error', (e) => console.error("Error:", e.message));
    });
}

get('https://gadfly-server.onrender.com/api/user?role=partner&partnerRole=expert');
