const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMileageData() {
    try {
        // Check if any tracking_data records have mileage
        const withMileage = await prisma.trackingData.count({
            where: {
                mileage: {
                    not: null
                }
            }
        });

        const total = await prisma.trackingData.count();

        console.log(`Total tracking records: ${total}`);
        console.log(`Records with mileage: ${withMileage}`);
        console.log(`Records without mileage: ${total - withMileage}`);

        if (withMileage > 0) {
            // Show sample of mileage values
            const samples = await prisma.trackingData.findMany({
                where: {
                    mileage: { not: null }
                },
                select: {
                    id: true,
                    mileage: true,
                    vehicle_id: true,
                    time_to: true
                },
                take: 5,
                orderBy: { time_to: 'desc' }
            });

            console.log('\nSample records with mileage:');
            console.log(samples);
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkMileageData();
