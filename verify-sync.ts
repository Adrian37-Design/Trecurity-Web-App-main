import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== OFFLINE SYNC VERIFICATION ===\n");

    // Setup: Create test company and vehicle
    const testCompany = await prisma.company.upsert({
        where: { email: 'test-sync@test.com' },
        update: {},
        create: {
            name: 'Test Sync Company',
            email: 'test-sync@test.com',
            phone: '+263123456789'
        }
    });

    const testVehicle = await prisma.vehicle.upsert({
        where: { number_plate: 'TEST-SYNC-001' },
        update: {},
        create: {
            number_plate: 'TEST-SYNC-001',
            type: 'Car',
            company_id: testCompany.id
        }
    });

    console.log(`✓ Test vehicle created: ${testVehicle.number_plate}\n`);

    // Clean up old tracking data
    await prisma.trackingData.deleteMany({ where: { vehicle_id: testVehicle.id } });

    const API_URL = "http://localhost:3000/api/device/tracking-data";

    async function sendData(payload: any) {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        console.log(`API Response (${res.status}):`, JSON.stringify(json, null, 2));
        return json;
    }

    // Test timestamps
    const now = Date.now();
    const T_OLD = new Date(now - 3600000).toISOString(); // 1 hour ago
    const T_CURRENT = new Date(now - 1800000).toISOString(); // 30 min ago
    const T_NEW = new Date(now).toISOString(); // Now

    // Step 1: Set "current" location (T_CURRENT)
    console.log("Test 1: Setting initial location (30 minutes ago)...");
    await sendData({
        vehicle_id: testVehicle.id,
        lat: 10.0,
        lon: 10.0,
        speed: 50,
        time_from: T_CURRENT,
        time_to: T_CURRENT,
        altitude: 100,
        course: 0,
        hdop: 1.0,
        signal_strength: 90,
        satellites: 12,
        ip_address: "127.0.0.1",
        state: "MOVING",
        age: 0
    });

    let vehicle = await prisma.vehicle.findUnique({ where: { id: testVehicle.id } });
    console.log(`✓ Vehicle last_seen: ${vehicle?.last_seen}`);
    console.log(`✓ Expected: ${T_CURRENT}`);
    console.log(vehicle?.last_seen?.toISOString() === T_CURRENT ? "✅ PASS\n" : "❌ FAIL\n");

    // Step 2: Send OLD data (should NOT update vehicle.last_seen)
    console.log("Test 2: Sending OLD data (1 hour ago)...");
    await sendData({
        vehicle_id: testVehicle.id,
        lat: 5.0,
        lon: 5.0,
        speed: 30,
        time_from: T_OLD,
        time_to: T_OLD,
        altitude: 100,
        course: 0,
        hdop: 1.0,
        signal_strength: 80,
        satellites: 10,
        ip_address: "127.0.0.1",
        state: "MOVING",
        age: 0
    });

    vehicle = await prisma.vehicle.findUnique({ where: { id: testVehicle.id } });
    console.log(`✓ Vehicle last_seen: ${vehicle?.last_seen}`);
    console.log(`✓ Still: ${T_CURRENT} (should NOT change)`);
    console.log(vehicle?.last_seen?.toISOString() === T_CURRENT ? "✅ PASS - Old data ignored\n" : "❌ FAIL - Updated incorrectly\n");

    // Step 3: Send NEW data (should UPDATE vehicle.last_seen)
    console.log("Test 3: Sending NEW data (now)...");
    await sendData({
        vehicle_id: testVehicle.id,
        lat: 20.0,
        lon: 20.0,
        speed: 70,
        time_from: T_NEW,
        time_to: T_NEW,
        altitude: 100,
        course: 0,
        hdop: 1.0,
        signal_strength: 95,
        satellites: 15,
        ip_address: "127.0.0.1",
        state: "MOVING",
        age: 0
    });

    vehicle = await prisma.vehicle.findUnique({ where: { id: testVehicle.id } });
    console.log(`✓ Vehicle last_seen: ${vehicle?.last_seen}`);
    console.log(`✓ Expected: ${T_NEW}`);
    console.log(vehicle?.last_seen?.toISOString() === T_NEW ? "✅ PASS - New data applied\n" : "❌ FAIL\n");

    // Step 4: Send BATCH (mixed old and new) - should use NEWEST
    console.log("Test 4: Sending BATCH (3 points, different times)...");
    const T_FUTURE = new Date(now + 600000).toISOString(); // 10 min future

    await sendData([
        { vehicle_id: testVehicle.id, lat: 8.0, lon: 8.0, speed: 40, time_from: T_OLD, time_to: T_OLD, altitude: 100, course: 0, hdop: 1.0, signal_strength: 80, satellites: 10, ip_address: "127.0.0.1", state: "MOVING", age: 0 },
        { vehicle_id: testVehicle.id, lat: 15.0, lon: 15.0, speed: 60, time_from: T_CURRENT, time_to: T_CURRENT, altitude: 100, course: 0, hdop: 1.0, signal_strength: 85, satellites: 11, ip_address: "127.0.0.1", state: "MOVING", age: 0 },
        { vehicle_id: testVehicle.id, lat: 30.0, lon: 30.0, speed: 80, time_from: T_FUTURE, time_to: T_FUTURE, altitude: 100, course: 0, hdop: 1.0, signal_strength: 100, satellites: 20, ip_address: "127.0.0.1", state: "MOVING", age: 0 }
    ]);

    vehicle = await prisma.vehicle.findUnique({ where: { id: testVehicle.id } });
    console.log(`✓ Vehicle last_seen: ${vehicle?.last_seen}`);
    console.log(`✓ Expected: ${T_FUTURE} (newest in batch)`);
    console.log(vehicle?.last_seen?.toISOString() === T_FUTURE ? "✅ PASS - Batch processed correctly\n" : "❌ FAIL\n");

    // Verify all data was saved to history
    const trackingCount = await prisma.trackingData.count({ where: { vehicle_id: testVehicle.id } });
    console.log(`Test 5: Checking historical data storage...`);
    console.log(`✓ Tracking records saved: ${trackingCount}`);
    console.log(trackingCount === 7 ? "✅ PASS - All points saved to history\n" : "❌ FAIL -Expected 7, got ${trackingCount}\n");

    console.log("=== VERIFICATION COMPLETE ===");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
