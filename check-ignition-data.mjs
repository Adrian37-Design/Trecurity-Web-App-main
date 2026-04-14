import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity'
        }
    }
});

async function checkIgnitionData() {
    try {
        // Check if we have any tracking data with ignition status
        const withIgnition = await prisma.trackingData.count({
            where: { ignition: true }
        });

        const withoutIgnition = await prisma.trackingData.count({
            where: { ignition: false }
        });

        const nullIgnition = await prisma.trackingData.count({
            where: { ignition: null }
        });

        const total = await prisma.trackingData.count();

        console.log('📊 Ignition Data Statistics:');
        console.log('  Total records:', total);
        console.log('  Ignition ON:', withIgnition);
        console.log('  Ignition OFF:', withoutIgnition);
        console.log('  Ignition NULL:', nullIgnition);

        if (withIgnition === 0) {
            console.log('\n⚠️  WARNING: No records with ignition=true found!');
            console.log('   Operating hours will show "No Data" until devices report ignition status.');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkIgnitionData();
