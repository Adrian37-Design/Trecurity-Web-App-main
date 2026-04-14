import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity'
        }
    }
});

async function checkVehicleData() {
    try {
        const numberPlate = 'XCELAV1';

        // Get vehicle info
        const vehicle = await prisma.vehicle.findUnique({
            where: { number_plate: numberPlate },
            select: { id: true, number_plate: true }
        });

        if (!vehicle) {
            console.log(`❌ Vehicle ${numberPlate} not found`);
            return;
        }

        console.log(`📊 Data for vehicle: ${numberPlate}`);
        console.log(`   Vehicle ID: ${vehicle.id}`);

        // Count tracking data for this vehicle
        const totalRecords = await prisma.trackingData.count({
            where: { vehicle_id: vehicle.id }
        });

        const ignitionOn = await prisma.trackingData.count({
            where: {
                vehicle_id: vehicle.id,
                ignition: true
            }
        });

        const ignitionOff = await prisma.trackingData.count({
            where: {
                vehicle_id: vehicle.id,
                ignition: false
            }
        });

        console.log(`   Total tracking records: ${totalRecords}`);
        console.log(`   Ignition ON records: ${ignitionOn}`);
        console.log(`   Ignition OFF records: ${ignitionOff}`);

        if (ignitionOn === 0) {
            console.log('\n⚠️  This vehicle has NO records with ignition=true!');
            console.log('   Operating hours will be 0.0 until the device reports ignition status.');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkVehicleData();
