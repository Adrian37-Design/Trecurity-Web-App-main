import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GPS Tracker Simulator
 * 
 * This script simulates a GPS tracker polling the server for commands
 * and executing them. Use this to test engine lock commands without
 * a physical device.
 */

async function simulateTracker(vehicleId: string) {
    console.log("🚗 GPS Tracker Simulator Started");
    console.log(`📍 Monitoring vehicle: ${vehicleId}\n`);

    let pollCount = 0;

    // Poll every 5 seconds (real tracker would poll every 30-60s)
    const interval = setInterval(async () => {
        pollCount++;
        console.log(`[${new Date().toLocaleTimeString()}] Poll #${pollCount} - Checking for commands...`);

        try {
            // 1. Check for pending commands (what real tracker does)
            const pendingCommands = await prisma.controllerCommand.findMany({
                where: {
                    vehicle_id: vehicleId,
                    is_executed: false,
                    code: {
                        in: ['ENGINE_LOCK', 'ENGINE_UN_LOCK']
                    }
                },
                orderBy: {
                    created_at: 'desc'
                }
            });

            if (pendingCommands.length === 0) {
                console.log("   ✓ No pending commands\n");
                return;
            }

            // 2. Execute the command
            const command = pendingCommands[0];
            console.log(`   🔔 COMMAND RECEIVED: ${command.code}`);
            console.log(`   ⚙️  Executing command...`);

            // Simulate execution delay (1-3 seconds)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 3. Mark command as executed
            await prisma.controllerCommand.update({
                where: { id: command.id },
                data: { is_executed: true }
            });

            // 4. Update tracking data to reflect new state
            const newEngineState = command.code === 'ENGINE_LOCK';

            const latestTracking = await prisma.trackingData.findFirst({
                where: { vehicle_id: vehicleId },
                orderBy: { updated_at: 'desc' }
            });

            if (latestTracking) {
                await prisma.trackingData.update({
                    where: { id: latestTracking.id },
                    data: {
                        is_engine_locked: newEngineState,
                        time_to: new Date()  // Update timestamp
                    }
                });
            }

            console.log(`   ✅ Command executed: Engine is now ${newEngineState ? 'LOCKED 🔒' : 'UNLOCKED 🔓'}`);
            console.log(`   📤 Confirmation sent to server\n`);

        } catch (error) {
            console.error("   ❌ Error:", error.message);
        }
    }, 5000); // Poll every 5 seconds

    // Run for 5 minutes then stop
    setTimeout(() => {
        clearInterval(interval);
        console.log("\n🛑 Tracker simulator stopped");
        console.log(`Total polls: ${pollCount}`);
        prisma.$disconnect();
    }, 300000); // 5 minutes
}

// Get vehicle ID from command line or use first vehicle
async function main() {
    const vehicleId = process.argv[2];

    if (!vehicleId) {
        console.log("❌ Please provide a vehicle ID");
        console.log("Usage: npx tsx simulate-gps-tracker.ts <vehicle_id>\n");

        // Show available vehicles
        const vehicles = await prisma.vehicle.findMany({
            take: 5,
            select: {
                id: true,
                number_plate: true,
                type: true
            }
        });

        console.log("Available vehicles:");
        vehicles.forEach(v => {
            console.log(`  ${v.number_plate} (${v.type})`);
            console.log(`    ID: ${v.id}`);
        });

        await prisma.$disconnect();
        return;
    }

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId }
    });

    if (!vehicle) {
        console.log(`❌ Vehicle with ID ${vehicleId} not found`);
        await prisma.$disconnect();
        return;
    }

    console.log(`✅ Found vehicle: ${vehicle.number_plate}`);
    console.log("📡 Starting tracker simulation...\n");

    await simulateTracker(vehicleId);
}

main().catch(console.error);
