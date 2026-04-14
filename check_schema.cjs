const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSchema() {
    try {
        // Try to query with external_battery_voltage
        const result = await prisma.trackingData.findFirst({
            select: {
                id: true,
                mileage: true,
                battery_percentage: true,
                external_battery_voltage: true // This will fail if column doesn't exist
            }
        });

        console.log('✅ external_battery_voltage column EXISTS in database');
        console.log('Sample:', result);
    } catch (error) {
        if (error.message.includes('external_battery_voltage')) {
            console.log('❌ external_battery_voltage column DOES NOT EXIST in database');
            console.log('Error:', error.message);
        } else {
            console.log('Other error:', error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
