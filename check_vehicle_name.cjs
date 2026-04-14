const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkVehicles() {
    try {
        const escavator = await prisma.vehicle.findMany({
            where: {
                name: {
                    contains: 'ESCAVATOR'
                }
            },
            select: { id: true, name: true }
        });

        const excavator = await prisma.vehicle.findMany({
            where: {
                name: {
                    contains: 'EXCAVATOR'
                }
            },
            select: { id: true, name: true }
        });

        console.log('=== VERIFICATION ===');
        console.log(`Vehicles with ESCAVATOR: ${escavator.length}`);
        if (escavator.length > 0) {
            console.log('Found:', escavator);
        }
        console.log(`Vehicles with EXCAVATOR: ${excavator.length}`);
        if (excavator.length > 0) {
            console.log('Found:', excavator);
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkVehicles();
