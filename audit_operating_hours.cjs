const { PrismaClient } = require('@prisma/client');

// Use the production-vibe connection string from .env.deploy
const DATABASE_URL = "mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity";

async function audit() {
    const prisma = new PrismaClient({
        datasources: { db: { url: DATABASE_URL } }
    });

    console.log('--- AUDITING XCELAV1 OPERATING HOURS ---');
    console.log('Current local time:', new Date().toLocaleString());

    try {
        const vehicle = await prisma.vehicle.findUnique({
            where: { number_plate: 'XCELAV1' }
        });

        if (!vehicle) {
            console.log('❌ ERROR: Vehicle XCELAV1 not found.');
            return;
        }

        console.log(`Vehicle ID: ${vehicle.id}`);
        console.log(`Last Seen: ${vehicle.last_seen}`);

        const points = await prisma.trackingData.findMany({
            where: {
                vehicle_id: vehicle.id,
                time_from: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) } // Last 12 hours
            },
            orderBy: { time_from: 'asc' }
        });

        console.log(`Found ${points.length} points in the last 12 hours.`);

        if (points.length === 0) {
            console.log('⚠️ No data points received for XCELAV1 in the last 12 hours.');
        } else {
            let totalOperatingMinutes = 0;
            for (let i = 1; i < points.length; i++) {
                const prev = points[i-1];
                const curr = points[i];
                
                const timeDiff = (new Date(curr.time_from) - new Date(prev.time_from)) / (1000 * 60); // minutes
                const isIgnitionOn = curr.ignition === true || curr.ignition === 'true' || curr.ignition === 1 || curr.ignition === '1';
                const isPrevIgnitionOff = prev.ignition === false || prev.ignition === 'false' || prev.ignition === 0 || prev.ignition === '0';
                
                // My logic from analytics.get.ts
                const gapThreshold = (isIgnitionOn && !isPrevIgnitionOff) ? 720 : 30;
                
                if (timeDiff > 0 && timeDiff <= gapThreshold && isIgnitionOn) {
                    totalOperatingMinutes += timeDiff;
                    console.log(`[${curr.time_from.toISOString()}] ACCRUED: ${timeDiff.toFixed(2)} mins (Ignition: ${curr.ignition})`);
                }
            }
            console.log(`\nTOTAL ACCRUED OPERATING HOURS: ${(totalOperatingMinutes / 60).toFixed(2)} hours`);
        }

    } catch (error) {
        console.error('❌ DATABASE ERROR:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

audit();
