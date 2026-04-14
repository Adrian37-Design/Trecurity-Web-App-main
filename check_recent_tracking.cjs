
process.env.DATABASE_URL = "mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Fetch last 5 tracking data points
        const data = await prisma.trackingData.findMany({
            take: 5,
            orderBy: {
                created_at: 'desc'
            },
            include: {
                vehicle: {
                    select: {
                        number_plate: true,
                        type: true
                    }
                }
            }
        });

        console.log("--- LATEST TRACKING DATA ---");
        data.forEach(d => {
            console.log(`\nTime: ${d.created_at.toLocaleString()}`);
            console.log(`Vehicle: ${d.vehicle?.number_plate} (${d.vehicle?.type})`);
            console.log(`State: ${d.state}`);
            console.log(`Ignition: ${d.ignition}`);
            console.log(`Speed: ${d.speed} km/h`);
            console.log(`Battery: ${d.battery_percentage}% (Ext: ${d.external_battery_voltage}V)`);
            console.log(`Satellites: ${d.satellites}`);
        });
        console.log("\n----------------------------");

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
