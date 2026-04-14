import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== TESTING OPERATING HOURS & PARKING TIME ===\n");

    const vehicleId = "cmjg5u8pc0002vhvsznrphxre"; // TEST-SYNC-001

    // Send mixed data: moving, stationary with engine on, stationary with engine off
    const now = Date.now();

    const testData = [
        // 1. Moving with engine ON (counts for: drive_time, operating_hours)
        {
            vehicle_id: vehicleId,
            lat: -17.8250,
            lon: 31.0330,
            speed: 60,
            time_from: new Date(now - 3600000).toISOString(), // 1 hour ago
            time_to: new Date(now - 3000000).toISOString(),   // 50 min ago
            altitude: 1500,
            course: 90,
            hdop: 1.0,
            signal_strength: 95,
            satellites: 12,
            ip_address: "127.0.0.1",
            state: "MOVING",
            ignition: true,
            age: 0
        },
        // 2. Parked with engine ON / idling (counts for: park_time, operating_hours)
        {
            vehicle_id: vehicleId,
            lat: -17.8255,
            lon: 31.0335,
            speed: 0,
            time_from: new Date(now - 3000000).toISOString(), // 50 min ago
            time_to: new Date(now - 2400000).toISOString(),   // 40 min ago  
            altitude: 1500,
            course: 0,
            hdop: 1.0,
            signal_strength: 95,
            satellites: 12,
            ip_address: "127.0.0.1",
            state: "STATIONARY",
            ignition: true,  // Engine ON but not moving
            age: 0
        },
        // 3. Parked with engine OFF (counts for: park_time only)
        {
            vehicle_id: vehicleId,
            lat: -17.8255,
            lon: 31.0335,
            speed: 0,
            time_from: new Date(now - 2400000).toISOString(), // 40 min ago
            time_to: new Date(now - 1800000).toISOString(),   // 30 min ago
            altitude: 1500,
            course: 0,
            hdop: 1.0,
            signal_strength: 95,
            satellites: 12,
            ip_address: "127.0.0.1",
            state: "STATIONARY",
            ignition: false,  // Engine OFF
            age: 0
        }
    ];

    console.log("Sending test data with different states...\n");

    for (const data of testData) {
        const res = await fetch("http://localhost:3000/api/device/tracking-data", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        console.log(`✓ Sent ${data.state} (ignition: ${data.ignition}):`, json.message);
    }

    console.log("\n=== Expected Analytics Results ===");
    console.log("Drive Time: ~10 minutes (moving with engine on)");
    console.log("Park Time: ~20 minutes (10 min engine on + 10 min engine off)");
    console.log("Operating Hours: ~20 minutes (10 min moving + 10 min idling)");
    console.log("\n✅ Now check analytics in dashboard!");

    await prisma.$disconnect();
}

main();
