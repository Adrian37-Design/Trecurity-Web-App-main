
const { PrismaClient } = require('@prisma/client');
require('dotenv').config(); // Load environment variables

const prisma = new PrismaClient();

async function checkFutureData() {
    const now = new Date();
    console.log("Checking data newer than:", now.toISOString());

    // Count future tracking data
    const count = await prisma.trackingData.count({
        where: {
            time_to: {
                gt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day cushion
            }
        }
    });

    console.log(`Found ${count} records with time_to > 24 hours from now.`);

    if (count > 0) {
        const records = await prisma.trackingData.findMany({
            where: {
                time_to: {
                    gt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                }
            },
            select: {
                id: true,
                time_to: true,
                created_at: true,
                vehicle: {
                    select: {
                        number_plate: true
                    }
                }
            },
            orderBy: {
                time_to: 'desc'
            },
            take: 5
        });
        console.log("Sample records:");
        console.log(JSON.stringify(records, null, 2));
    }

    // Also check vehicles with last_seen > now
    const vehicles = await prisma.vehicle.count({
        where: {
            last_seen: {
                gt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
        }
    });
    console.log(`Found ${vehicles} vehicles with last_seen > 24 hours from now.`);

}

checkFutureData()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
