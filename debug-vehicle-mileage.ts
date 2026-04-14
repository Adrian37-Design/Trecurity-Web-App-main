
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity',
        },
    },
});

async function main() {
    console.log("=== DEBUGGING MILEAGE FOR AGH0296 ===\n");

    const plate = 'AGH0296';
    const vehicle = await prisma.vehicle.findUnique({
        where: { number_plate: plate },
        include: { company: true }
    });

    if (!vehicle) {
        console.error(`❌ Vehicle ${plate} NOT FOUND in database.`);
        return;
    }
    console.log(`✓ Found Vehicle: ${vehicle.number_plate} (ID: ${vehicle.id})`);
    console.log(`  Company: ${vehicle.company.name}`);

    // Check data count
    const count = await prisma.trackingData.count({ where: { vehicle_id: vehicle.id } });
    console.log(`\n• Total Tracking Points: ${count}`);

    if (count === 0) {
        console.log("❌ No data points. Mileage cannot be calculated.");
        return;
    }

    // Get Date Range
    const minTime = await prisma.trackingData.aggregate({
        where: { vehicle_id: vehicle.id },
        _min: { time_from: true },
        _max: { time_from: true }
    });
    console.log(`\n• Date Range of Data:`);
    console.log(`  - Earliest: ${minTime._min.time_from}`);
    console.log(`  - Latest:   ${minTime._max.time_from}`);

    // Get last 50 points to check for movement
    const points = await prisma.trackingData.findMany({
        where: { vehicle_id: vehicle.id },
        orderBy: { time_from: 'desc' }, // newest first
        take: 50
    });

    console.log(`\n• Analyzing last ${points.length} points:`);
    let movingCount = 0;
    let validGpsCount = 0;

    points.forEach((p, i) => {
        const isMoving = p.state === 'MOVING' || (p.speed && p.speed > 0);
        const hasGps = p.lat !== 0 && p.lon !== 0;

        if (isMoving) movingCount++;
        if (hasGps) validGpsCount++;

        if (i < 5) { // Print details for newest 5
            console.log(`  [${p.time_from.toISOString()}] Lat: ${p.lat}, Lon: ${p.lon}, Speed: ${p.speed}, State: ${p.state}`);
        }
    });

    console.log(`\n• Summary of last 50 points:`);
    console.log(`  - Points with MOVING state/speed: ${movingCount}`);
    console.log(`  - Points with Non-Zero Coordinates: ${validGpsCount}`);

    // Calculate mileage on this sample (Chronological)
    const chronoPoints = points.reverse(); // old to new
    let totalDist = 0;

    // Haversine
    const haversine = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    chronoPoints.reduce((prev, curr) => {
        if (prev && prev.lat && prev.lon && curr.lat && curr.lon) {
            // Filter noise? The API doesn't filter noise in the code I saw, 
            // but let's see raw calc.
            const d = haversine(prev.lat, prev.lon, curr.lat, curr.lon);
            totalDist += d;
        }
        return curr;
    }, null);

    console.log(`\n• Calculated Sample Mileage: ${totalDist.toFixed(4)} km`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
