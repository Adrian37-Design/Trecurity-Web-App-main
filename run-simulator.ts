import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';

const prisma = new PrismaClient();

async function main() {
    const vehicle = await prisma.vehicle.findFirst({
        orderBy: { created_at: 'desc' }
    });

    if (!vehicle) {
        console.log("❌ No vehicles found");
        return;
    }

    console.log(`✅ Found vehicle: ${vehicle.number_plate}`);
    console.log(`📍 Vehicle ID: ${vehicle.id}`);
    console.log(`\n🚀 Starting GPS tracker simulator...\n`);

    await prisma.$disconnect();

    // Run the simulator
    exec(`npx tsx simulate-gps-tracker.ts ${vehicle.id}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(stdout);
    });
}

main();
