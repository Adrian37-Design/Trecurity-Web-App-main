import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Quick helper to get a vehicle ID for testing
 */

async function main() {
    const vehicles = await prisma.vehicle.findMany({
        take: 10,
        select: {
            id: true,
            number_plate: true,
            type: true
        },
        orderBy: {
            created_at: 'desc'
        }
    });

    console.log("=== AVAILABLE VEHICLES ===\n");

    vehicles.forEach((v, i) => {
        console.log(`${i + 1}. ${v.number_plate} (${v.type})`);
        console.log(`   ID: ${v.id}\n`);
    });

    console.log("To simulate a tracker:");
    console.log(`npx tsx simulate-gps-tracker.ts ${vehicles[0]?.id}`);

    await prisma.$disconnect();
}

main().catch(console.error);
