import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== UPDATING EXISTING VEHICLES ===\n");

    // Get all vehicles
    const vehicles = await prisma.vehicle.findMany({
        where: {
            number_plate: {
                not: {
                    startsWith: "TEST-"
                }
            }
        },
        take: 3
    });

    if (vehicles.length === 0) {
        console.log("❌ No existing vehicles found!");
        return;
    }

    console.log(`Found ${vehicles.length} vehicle(s) to update\n`);

    for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];

        // Delete old tracking data
        await prisma.trackingData.deleteMany({
            where: { vehicle_id: vehicle.id }
        });

        let scenario;
        let trackingData;

        // Create different scenarios for each vehicle
        if (i === 0) {
            // Vehicle 1: Good GPS, Good Battery
            scenario = "Good GPS & Battery";
            trackingData = {
                satellites: 12,  // Excellent GPS
                battery_percentage: 95,
                signal_strength: 25,
                speed: 45,
                state: "MOVING" as const,
                ignition: true
            };
        } else if (i === 1) {
            // Vehicle 2: No GPS Signal (indoor/tunnel)
            scenario = "No GPS Signal (Has GPRS)";
            trackingData = {
                satellites: 2,  // < 4 = No GPS
                battery_percentage: 68,
                signal_strength: 15,
                speed: 0,
                state: "STATIONARY" as const,
                ignition: false
            };
        } else {
            // Vehicle 3: Low Battery
            scenario = "Low Battery Warning";
            trackingData = {
                satellites: 8,
                battery_percentage: 25,  // Low battery
                signal_strength: 20,
                speed: 0,
                state: "STATIONARY" as const,
                ignition: false
            };
        }

        // Update vehicle last_seen
        await prisma.vehicle.update({
            where: { id: vehicle.id },
            data: { last_seen: new Date() }
        });

        // Create new tracking data
        await prisma.trackingData.create({
            data: {
                vehicle_id: vehicle.id,
                lat: -17.8252 + (i * 0.01),
                lon: 31.0335 + (i * 0.01),
                speed: trackingData.speed,
                time_from: new Date(Date.now() - 3600000),
                time_to: new Date(),
                altitude: 1500,
                course: trackingData.speed > 0 ? 90 : 0,
                hdop: 1.0,
                signal_strength: trackingData.signal_strength,
                satellites: trackingData.satellites,
                battery_percentage: trackingData.battery_percentage,
                fuel_level: 60,
                ignition: trackingData.ignition,
                ip_address: `192.168.1.${100 + i}`,
                state: trackingData.state,
                age: 0,
                operator_name: i === 0 ? "Econet" : i === 1 ? "NetOne" : "Telecel"
            }
        });

        const voltage = (11.8 + (trackingData.battery_percentage / 100) * 0.8).toFixed(1);

        console.log(`✅ Updated: ${vehicle.number_plate}`);
        console.log(`   Scenario: ${scenario}`);
        console.log(`   Battery: ${trackingData.battery_percentage}% (${voltage}V)`);
        console.log(`   Satellites: ${trackingData.satellites}`);
        console.log(`   Signal: ${trackingData.signal_strength}/30`);
        console.log(`   Status: ${trackingData.satellites < 4 ? '🟠 No GPS Signal' : trackingData.signal_strength > 19 ? '🟢 Excellent' : '🟢 Good'}\n`);
    }

    console.log("=== SUMMARY ===");
    console.log("Vehicle 1: Good GPS & Battery (Moving)");
    console.log("Vehicle 2: No GPS Signal (Stationary, Indoor)");
    console.log("Vehicle 3: Low Battery (Stationary)");
    console.log("\n📍 Refresh the map/dashboard to see changes!");

    await prisma.$disconnect();
}

main().catch(console.error);
