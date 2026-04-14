const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSpelling() {
    try {
        // Find all vehicles with ESCAVATOR in the name
        const vehicles = await prisma.vehicle.findMany({
            where: {
                name: {
                    contains: 'ESCAVATOR'
                }
            }
        });

        console.log(`Found ${vehicles.length} vehicle(s) with ESCAVATOR in the name`);

        // Update each one
        for (const vehicle of vehicles) {
            const newName = vehicle.name.replace('ESCAVATOR', 'EXCAVATOR');
            console.log(`Updating: "${vehicle.name}" -> "${newName}"`);

            await prisma.vehicle.update({
                where: { id: vehicle.id },
                data: { name: newName }
            });
        }

        console.log('✅ Successfully updated all vehicles!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixSpelling();
