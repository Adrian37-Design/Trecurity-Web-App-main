import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== CREATING TEST VEHICLES ===\n");

    const testUser = await prisma.user.findFirst({
        where: { email: "test@example.com" }
    });

    if (!testUser) {
        console.error("❌ Test user not found!");
        return;
    }

    const testCompany = await prisma.company.findFirst();

    if (!testCompany) {
        console.error("❌ No company found!");
        return;
    }

    // 1. Create STATIONARY vehicle
    const stationaryVehicle = await prisma.vehicle.create({
        data: {
            number_plate: "TEST-STATIONARY-001",
            type: "CAR",
            company_id: testCompany.id,
            status: true,
            last_seen: new Date(),
            user: {
                connect: { id: testUser.id }
            }
        }
    });

    console.log("✅ Created stationary vehicle:", stationaryVehicle.number_plate);

    // Add tracking data for stationary vehicle
    await prisma.trackingData.create({
        data: {
            vehicle_id: stationaryVehicle.id,
            lat: -17.8252,
            lon: 31.0335,
            speed: 0,
            time_from: new Date(Date.now() - 3600000), // 1 hour ago
            time_to: new Date(),
            altitude: 1500,
            course: 0,
            hdop: 1.0,
            signal_strength: 18,
            satellites: 12,
            battery_percentage: 85,
            fuel_level: 45,
            ignition: false,
            ip_address: "192.168.1.100",
            state: "STATIONARY",
            age: 0,
            operator_name: "Econet"
        }
    });

    console.log("✅ Added stationary tracking data\n");

    // 2. Create MOVING vehicle
    const movingVehicle = await prisma.vehicle.create({
        data: {
            number_plate: "TEST-MOVING-002",
            type: "TRUCK",
            company_id: testCompany.id,
            status: true,
            last_seen: new Date(),
            user: {
                connect: { id: testUser.id }
            }
        }
    });

    console.log("✅ Created moving vehicle:", movingVehicle.number_plate);

    // Add tracking data for moving vehicle
    await prisma.trackingData.create({
        data: {
            vehicle_id: movingVehicle.id,
            lat: -17.8300,
            lon: 31.0400,
            speed: 65,
            time_from: new Date(Date.now() - 300000), // 5 min ago
            time_to: new Date(),
            altitude: 1520,
            course: 45, // Northeast
            hdop: 1.0,
            signal_strength: 22,
            satellites: 14,
            battery_percentage: 92,
            fuel_level: 78,
            ignition: true,
            ip_address: "192.168.1.101",
            state: "MOVING",
            age: 0,
            operator_name: "NetOne"
        }
    });

    console.log("✅ Added moving tracking data\n");

    console.log("=== SUMMARY ===");
    console.log(`Stationary Vehicle: ${stationaryVehicle.number_plate}`);
    console.log(`  - Battery: 85% (12.4V)`);
    console.log(`  - State: STATIONARY`);
    console.log(`  - Ignition: OFF`);
    console.log(`  - Speed: 0 km/h\n`);

    console.log(`Moving Vehicle: ${movingVehicle.number_plate}`);
    console.log(`  - Battery: 92% (12.5V)`);
    console.log(`  - State: MOVING`);
    console.log(`  - Ignition: ON`);
    console.log(`  - Speed: 65 km/h`);
    console.log(`  - Direction: Northeast\n`);

    console.log("✅ Test vehicles created successfully!");
    console.log("🗺️  Go to the map to see both vehicles marked!");

    await prisma.$disconnect();
}

main().catch(console.error);
