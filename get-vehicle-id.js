const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getVehicleId() {
    const vehicle = await prisma.vehicle.findUnique({
        where: { number_plate: 'TEST-SYNC-001' }
    });

    console.log('\n=== VEHICLE INFO ===');
    console.log('Vehicle ID:', vehicle?.id);
    console.log('Number Plate:', vehicle?.number_plate);
    console.log('Last Seen:', vehicle?.last_seen);
    console.log('\nCopy this ID for the test script!');

    await prisma.$disconnect();
}

getVehicleId();
