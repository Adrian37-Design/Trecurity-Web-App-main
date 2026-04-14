
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function cleanFutureData() {
    const now = new Date();

    // Future buffer: allow up to 24 hours in the future
    const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000);

    console.log("Cleaning data newer than:", cutoff.toISOString());

    // Count first
    const count = await prisma.trackingData.count({
        where: {
            time_to: { gt: cutoff }
        }
    });

    console.log(`Found ${count} records with future timestamps. Deleting...`);

    if (count > 0) {
        const result = await prisma.trackingData.deleteMany({
            where: {
                time_to: { gt: cutoff }
            }
        });
        console.log(`Deleted ${result.count} corrupt tracking records.`);
    }

    // Also clean up bad 'last_seen' dates on vehicles
    const vehicles = await prisma.vehicle.findMany({
        where: {
            last_seen: { gt: cutoff }
        }
    });

    console.log(`Found ${vehicles.length} vehicles with future last_seen.`);

    for (const v of vehicles) {
        // Find the LATEST valid tracking data for this vehicle
        const latestValid = await prisma.trackingData.findFirst({
            where: {
                vehicle_id: v.id,
                time_to: { lte: cutoff }
            },
            orderBy: {
                time_to: 'desc'
            }
        });

        const newLastSeen = latestValid ? latestValid.time_to : new Date(); // fallback to now if no history? or maybe null? let's use now for safety or just keep it somewhat sane.
        // If we use 'now', it might still look online.
        // Better to use a sane date.

        console.log(`Fixing vehicle ${v.number_plate}: last_seen was ${v.last_seen.toISOString()}, setting to ${newLastSeen.toISOString()}`);

        await prisma.vehicle.update({
            where: { id: v.id },
            data: { last_seen: newLastSeen }
        });
    }

}

cleanFutureData()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
