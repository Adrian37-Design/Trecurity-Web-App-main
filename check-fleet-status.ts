
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity',
        },
    },
});

async function main() {
    console.log("=== FLEET STATUS DIAGNOSTIC ===\n");

    const vehicles = await prisma.vehicle.findMany({
        include: {
            company: { select: { name: true } }
        }
    });

    console.log(`Found ${vehicles.length} vehicles.\n`);
    console.log("Plate        | Last Seen DB        | Time Ago     | Last Data Point Time    | State      | Speed");
    console.log("-------------|---------------------|--------------|-------------------------|------------|------");

    const now = new Date();

    for (const v of vehicles) {
        // Get latest tracking point
        const lastPoint = await prisma.trackingData.findFirst({
            where: { vehicle_id: v.id },
            orderBy: { time_from: 'desc' }
        });

        let timeAgo = "N/A";
        if (v.last_seen) {
            const diffMs = now.getTime() - v.last_seen.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            timeAgo = diffHours > 0 ? `${diffHours}h ${diffMins % 60}m` : `${diffMins}m`;
        }

        const lastDataTime = lastPoint ? lastPoint.time_from.toISOString() : "NO DATA";
        const state = lastPoint ? lastPoint.state : "N/A";
        const speed = lastPoint ? lastPoint.speed : "N/A";

        console.log(`${v.number_plate.padEnd(12)} | ${v.last_seen ? v.last_seen.toISOString() : "NEVER".padEnd(19)} | ${timeAgo.padEnd(12)} | ${lastDataTime.padEnd(23)} | ${state.padEnd(10)} | ${speed}`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
