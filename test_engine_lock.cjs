
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testEngineLock() {
    const number_plate = "XCELAV1"; // The device in screenshot

    console.log(`Testing Engine Lock for ${number_plate}...`);

    // 1. Check current status
    const vehicle = await prisma.vehicle.findUnique({
        where: { number_plate },
        include: { tracking_data: { take: 1, orderBy: { time_to: 'desc' } } }
    });

    if (!vehicle) {
        console.error("Vehicle not found!");
        return;
    }

    console.log("Current Tracking Data (Top 1):", vehicle.tracking_data[0]);

    // 2. Simulate Upsert Payload with is_engine_locked: true
    // We cannot call the API handler directly easily, but we can verify the DB schema accepts it.
    // Actually, let's just inspect the last tracking data to see if 'is_engine_locked' is true/false.

    if (vehicle.tracking_data.length > 0) {
        console.log(`is_engine_locked in DB: ${vehicle.tracking_data[0].is_engine_locked}`);
    } else {
        console.log("No tracking data found.");
    }

    // 3. Try to manually update it to see if it works
    /*
    await prisma.trackingData.update({
        where: { id: vehicle.tracking_data[0].id },
        data: { is_engine_locked: true }
    });
    console.log("Manually set is_engine_locked to true.");
    */

}

testEngineLock()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
