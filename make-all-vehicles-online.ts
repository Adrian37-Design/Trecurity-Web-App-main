import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== MAKING ALL VEHICLES ONLINE ===\n");

    // Update all vehicles to have recent last_seen (online)
    const result = await prisma.vehicle.updateMany({
        data: {
            last_seen: new Date() // Set to now = online
        }
    });

    console.log(`✅ Updated ${result.count} vehicle(s)`);
    console.log(`   All vehicles now show as ONLINE (last_seen = now)`);
    console.log(`   Vehicles will GLOW on the map! 🟢\n`);

    console.log("📍 Refresh your map to see glowing markers!");

    await prisma.$disconnect();
}

main().catch(console.error);
