
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity"
        },
    },
});

async function main() {
    try {
        console.log("Connecting to DB...");
        // 1. Find vehicle ID by plate
        const vehicle = await prisma.vehicle.findUnique({
            where: { number_plate: 'XCELAV1' }
        });

        if (!vehicle) {
            console.log("Vehicle XCELAV1 not found!");
            return;
        }

        console.log(`Checking tracking data for XCELAV1 (ID: ${vehicle.id})...`);

        // 2. Fetch last 10 tracking data points for this vehicle
        const data = await prisma.trackingData.findMany({
            where: { vehicle_id: vehicle.id },
            take: 10,
            orderBy: {
                created_at: 'desc'
            }
        });

        if (data.length === 0) {
            console.log("No tracking data found for this vehicle.");
        } else {
            console.log(`Found ${data.length} records. Showing latest first:`);
            data.forEach(d => {
                console.log(`\nTime: ${d.created_at.toLocaleString()} (ID: ${d.id})`);
                console.log(`Lat/Long: ${d.latitude}, ${d.longitude}`);
                console.log(`Speed: ${d.speed} km/h | Satellites: ${d.satellites}`);
                console.log(`Ignition: ${d.ignition ? 'ON' : 'OFF'} | State: ${d.state}`);
                // Check if lat/long is 0,0 which means invalid GPS
                if (Math.abs(d.latitude) < 0.0001 && Math.abs(d.longitude) < 0.0001) {
                    console.log("WARNING: GPS Coordinates are effectively ZERO!");
                }
            });
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
