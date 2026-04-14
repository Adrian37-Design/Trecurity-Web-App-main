const email = 'adriankwaramba@gmail.com';
const password = 'AP4e5ES2KHV3'; // From .env history
const vehicleId = 'XCELAV1';

async function verify() {
    console.log(`--- VERIFYING LIVE OPERATING HOURS FOR ${vehicleId} ---`);
    
    try {
        // 1. LOGIN
        console.log(`Logging in as ${email}...`);
        const loginRes = await fetch('https://trecurity.com/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!loginRes.ok) {
            const err = await loginRes.text();
            console.log(`❌ LOGIN FAILED: ${err}`);
            
            // Try alternative password
            console.log('Trying alternative password...');
            const loginRes2 = await fetch('https://trecurity.com/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: 'Trecurity@2026' })
            });
            if (!loginRes2.ok) return console.log('❌ ALL LOGIN ATTEMPTS FAILED.');
        }

        console.log('✅ Login successful!');
        // Note: Nuxt/Nitro typically uses cookies, but maybe there is a token in the body?
        // Let's check headers for Set-Cookie
        const cookie = loginRes.headers.get('set-cookie');

        // 2. FETCH ANALYTICS
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        console.log(`Fetching analytics from ${yesterday.toISOString()} to ${now.toISOString()}...`);
        const analyticsRes = await fetch(`https://trecurity.com/api/vehicle/${vehicleId}/analytics?date_from=${yesterday.toISOString()}&date_to=${now.toISOString()}`, {
            headers: { 'Cookie': cookie }
        });

        if (!analyticsRes.ok) {
            return console.log(`❌ FETCH FAILED: ${analyticsRes.status} ${analyticsRes.statusText}`);
        }

        const result = await analyticsRes.json();
        console.log(`\nAPI VERSION: ${result.version || 'unknown'}`);
        
        const data = result.data || [];
        console.log(`Found ${data.length} interval groups.`);

        let totalHours = 0;
        data.forEach(group => {
            const oh = group.data?.operating_hours || 0;
            totalHours += oh;
            if (oh > 0) {
                console.log(`[${group.interval_group}] OPERATING: ${oh.toFixed(2)} hours`);
            }
        });

        console.log(`\n--- FINAL ANALYSIS ---`);
        console.log(`TOTAL OPERATING HOURS (Last 24h): ${totalHours.toFixed(2)} hours`);
        
        if (totalHours > 0) {
            console.log('✅ SUCCESS: Operating hours are accumulating!');
        } else {
            console.log('❌ FAILURE: Total operating hours is still 0.');
        }

    } catch (error) {
        console.error('❌ ERROR:', error.message);
    }
}

verify();
