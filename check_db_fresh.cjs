const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.trackingData.count();
        console.log(`Total TrackingData entries: ${count}`);

        const latest = await prisma.trackingData.findFirst({
            orderBy: { created_at: 'desc' }
        });
        console.log(`Latest TrackingData: ${latest ? JSON.stringify(latest.created_at) : 'None'}`);

        const vehicles = await prisma.vehicle.findMany({
            select: {
                number_plate: true,
                last_seen: true
            },
            orderBy: { last_seen: 'desc' },
            take: 5
        });
        console.log('Recent Vehicles last_seen:');
        vehicles.forEach(v => {
            console.log(`${v.number_plate}: ${v.last_seen}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
