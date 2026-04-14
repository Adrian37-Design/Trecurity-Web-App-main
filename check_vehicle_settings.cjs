
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const vehicle = await prisma.vehicle.findUnique({
            where: { number_plate: 'AEV2146' },
            select: {
                id: true,
                number_plate: true,
                geofence_alert_recipients: true,
                lock_engine_on_geofence_violation: true
            }
        });
        console.log('Vehicle Data Output:', JSON.stringify(vehicle, null, 2));
    } catch (e) {
        console.error('Error in script:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
