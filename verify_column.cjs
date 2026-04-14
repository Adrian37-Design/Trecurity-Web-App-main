const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyColumn() {
    try {
        // Try to query for the column
        const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tracking_data' 
      AND column_name = 'external_battery_voltage'
    `;

        if (result.length > 0) {
            console.log('✅ Column EXISTS in database:', result);
        } else {
            console.log('❌ Column DOES NOT EXIST in database');
        }
    } catch (error) {
        console.log('Error checking column:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verifyColumn();
