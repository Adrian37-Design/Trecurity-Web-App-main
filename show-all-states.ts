import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const vehicleId = "cmjg5u8pc0002vhvsznrphxre";

    console.log("=== VEHICLE TRACKING DATA (Last 2 hours) ===\n");

    const data = await prisma.trackingData.findMany({
        where: {
            vehicle_id: vehicleId,
            time_from: {
                gte: new Date(Date.now() - 7200000) // Last 2 hours
            }
        },
        orderBy: { time_from: 'desc' },
        select: {
            time_from: true,
            time_to: true,
            state: true,
            ignition: true,
            speed: true,
            lat: true,
            lon: true
        }
    });

    console.log(`Found ${data.length} tracking records:\n`);

    data.forEach((record, i) => {
        const duration = (new Date(record.time_to).getTime() - new Date(record.time_from).getTime()) / 60000;
        console.log(`${i + 1}. ${record.state} | Ignition: ${record.ignition ? 'ON' : 'OFF'} | Speed: ${record.speed}km/h`);
        console.log(`   From: ${new Date(record.time_from).toLocaleTimeString()}`);
        console.log(`   To:   ${new Date(record.time_to).toLocaleTimeString()}`);
        console.log(`   Duration: ${duration.toFixed(1)} minutes`);
        console.log(`   Location: ${record.lat}, ${record.lon}\n`);
    });

    // Summary
    const moving = data.filter(d => d.state === 'MOVING').length;
    const stationary = data.filter(d => d.state === 'STATIONARY').length;
    const engineOn = data.filter(d => d.ignition === true).length;

    console.log("=== SUMMARY ===");
    console.log(`Moving records: ${moving}`);
    console.log(`Stationary records: ${stationary}`);
    console.log(`Engine ON records: ${engineOn}`);

    await prisma.$disconnect();
}

main();
