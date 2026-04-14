const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRecentMileage() {
    try {
        // Get recent tracking data (last 50 records)
        const recentData = await prisma.trackingData.findMany({
            take: 50,
            orderBy: { time_to: 'desc' },
            select: {
                id: true,
                mileage: true,
                time_to: true,
                vehicle_id: true
            }
        });

        const withMileage = recentData.filter(d => d.mileage !== null && d.mileage !== undefined);
        const withoutMileage = recentData.filter(d => d.mileage === null || d.mileage === undefined);

        console.log('=== RECENT MILEAGE CHECK ===');
        console.log(`Total recent records checked: ${recentData.length}`);
        console.log(`With mileage: ${withMileage.length}`);
        console.log(`Without mileage: ${withoutMileage.length}`);

        if (withMileage.length > 0) {
            console.log('\n✅ GOOD NEWS: Mileage data IS being saved!');
            console.log('\nSample records with mileage:');
            withMileage.slice(0, 5).forEach(r => {
                console.log(`  - Time: ${r.time_to.toISOString()}, Mileage: ${r.mileage} km`);
            });
        } else {
            console.log('\n❌ No mileage data found in recent records.');
            console.log('GPS devices may not be sending mileage/odometer data.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkRecentMileage();
