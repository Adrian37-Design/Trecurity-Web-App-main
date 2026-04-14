
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        const vehicles = await prisma.vehicle.findMany({
            select: { number_plate: true, last_seen: true }
        });
        console.log(JSON.stringify(vehicles, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
