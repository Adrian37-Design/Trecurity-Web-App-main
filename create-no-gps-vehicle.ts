import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== CREATING TEST VEHICLE WITH NO GPS SIGNAL ===\n");

    const testUser = await prisma.user.findFirst();
    const testCompany = await prisma.company.findFirst();

    if (!testUser || !testCompany) {
        console.error("❌ No user or company found!");
        return;
    }

    // Create vehicle with GPRS but NO GPS
    const noGpsVehicle = await prisma.vehicle.create({
        data: {
            number_plate: "TEST-NO-GPS-003",
            type: "CAR",
            company_id: testCompany.id,
            status: true,
            last_seen: new Date(), // Recent = has GPRS
            user: {
                connect: { id: testUser.id }
            }
        }
    });

    console.log("✅ Created vehicle:", noGpsVehicle.number_plate);

    // Add tracking data with LOW satellite count (< 4)
    await prisma.trackingData.create({
        data: {
            vehicle_id: noGpsVehicle.id,
            lat: -17.8300,
            lon: 31.0350,
            speed: 0,
            time_from: new Date(),
            time_to: new Date(),
            altitude: 1500,
            course: 0,
            hdop: 2.5,
            signal_strength: 18, // Good cellular signal
            satellites: 2,  // ← ONLY 2 SATELLITES (< 4 = No GPS)
            battery_percentage: 75,  // 75% battery
            fuel_level: 50,
            ignition: false,
            ip_address: "192.168.1.102",
            state: "STATIONARY",
            age: 0,
            operator_name: "Econet"
        }
    });

    console.log("✅ Added tracking data\n");

    console.log("=== VEHICLE DETAILS ===");
    console.log(`Number Plate: ${noGpsVehicle.number_plate}`);
    console.log(`Battery: 75% (12.3V) 🔋`);
    console.log(`Satellites: 2 (< 4 = NO GPS LOCK) 🛰️`);
    console.log(`Signal Strength: 18 (Good GPRS) 📶`);
    console.log(`Last Seen: Just now ✅`);
    console.log(`\nStatus: Should show "No GPS Signal" (ORANGE) 🟠\n`);

    console.log("📍 Go check the map or vehicle details page!");
    console.log("   You should see:");
    console.log("   - Battery voltage: 75% (12.3V)");
    console.log("   - Signal status: 'No GPS Signal' in ORANGE");

    await prisma.$disconnect();
}

main().catch(console.error);
