
const BASE_URL = "http://localhost:3002";
const EMAIL = "adriantakudzwa7337@gmail.com";
const PASSWORD = "GuIvEX801VrU2G5q";

async function main() {
    console.log("=== VERIFYING API FIX ===");

    // 1. Login
    console.log(`Logging in as ${EMAIL}...`);
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    if (!loginRes.ok) {
        console.error("Login failed:", await loginRes.text());
        process.exit(1);
    }

    const loginData = await loginRes.json();
    const token = loginData.token; // Adjust based on actual response structure
    const user = loginData.user;

    // Cookie is usually set, but if token is returned we can use it in Authorization header or Cookie header
    // Nuxt usually expects a cookie 'token'.
    const cookieHeader = `token=${token}`;

    console.log("Login successful. Token obtained.");

    // 2. Get Vehicle
    // We need a vehicle ID. Let's try to list vehicles.
    console.log("Fetching vehicles...");
    // Assuming there is an endpoint to list vehicles, usually /api/vehicle or similar?
    // Based on file structure: server/api/vehicle/index.get.ts might exist?
    // Or server/api/company/[id]/vehicles.
    // Let's try to infer from typical structure or use the one from debug script if we can't find one.
    // 'AGH0296' was the plate.
    // Let's try to list ALL vehicles if possible.

    // If we can't list, we'll fail. But typically there's a dashboard endpoint.
    // Let's look at `list-accounts.ts` or similar? No.
    // Let's just try to hit /api/vehicle
    const vehiclesRes = await fetch(`${BASE_URL}/api/vehicle`, {
        headers: { "Cookie": cookieHeader }
    });

    let vehicleId;
    if (vehiclesRes.ok) {
        const vehicles = await vehiclesRes.json();
        // data usually wrapped in data property
        const list = vehicles.data || vehicles;
        const target = list.find((v: any) => v.number_plate === 'AGH0296') || list[0];
        if (target) {
            vehicleId = target.id;
            console.log(`Using vehicle: ${target.number_plate} (${vehicleId})`);
        }
    }

    if (!vehicleId) {
        console.error("Could not find a vehicle to test.");
        // Fallback to test ID from file if needed, but likely won't work if DB differs
        // vehicleId = "cmjg5u8pc0002vhvsznrphxre"; 
        process.exit(1);
    }

    // 3. Get Analytics
    const dateFrom = new Date("2025-12-01T00:00:00Z").toISOString();
    const dateTo = new Date("2026-01-08T23:59:59Z").toISOString();

    console.log(`Fetching analytics for ${vehicleId}...`);
    const analyticsRes = await fetch(`${BASE_URL}/api/vehicle/${vehicleId}/analytics?date_from=${dateFrom}&date_to=${dateTo}`, {
        headers: { "Cookie": cookieHeader }
    });

    if (!analyticsRes.ok) {
        console.error("Analytics fetch failed:", await analyticsRes.text());
        process.exit(1);
    }

    const analytics = await analyticsRes.json();
    const intervals = analytics.data;

    console.log(`Received ${intervals.length} intervals.`);

    // 4. Verify Sums
    const opHours = intervals.filter((i: any) => i.data.operating_hours > 1); // Filter for significant values

    if (opHours.length > 0) {
        console.log("✅ FOUND SIGNIFICANT OPERATING HOURS (Success!)");
        opHours.slice(0, 5).forEach((i: any) => {
            console.log(`  [${i.interval_group}] Op Hours: ${i.data.operating_hours}`);
        });
    } else {
        console.log("⚠️  NO SIGNIFICANT OPERATING HOURS FOUND.");
        console.log("This might mean the fix failed OR the data is just empty.");
        // Check if there are any small values
        const smallOpHours = intervals.filter((i: any) => i.data.operating_hours > 0);
        if (smallOpHours.length > 0) {
            console.log("  Found small values (likely averages if < 1 given the data nature):");
            smallOpHours.slice(0, 5).forEach((i: any) => {
                console.log(`  [${i.interval_group}] Op Hours: ${i.data.operating_hours}`);
            });
            if (smallOpHours[0].data.operating_hours < 1) {
                console.log("❌ FAILURE: Values look like averages (< 1).");
            }
        }
    }
}

main().catch(console.error);
