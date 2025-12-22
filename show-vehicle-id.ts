import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const vehicle = await prisma.vehicle.findUnique({
        where: { number_plate: 'TEST-SYNC-001' }
    });

    console.log('\n========================================');
    console.log('VEHICLE ID FOR MANUAL TESTING');
    console.log('========================================');
    console.log('\nVehicle ID:', vehicle?.id);
    console.log('Number Plate:', vehicle?.number_plate);
    console.log('Last Seen:', vehicle?.last_seen);
    console.log('\n========================================');
    console.log('COPY THIS FOR YOUR POWERSHELL TEST:');
    console.log('========================================');
    console.log(`$vehicleId = "${vehicle?.id}"`);
    console.log('========================================\n');

    await prisma.$disconnect();
}

main();
