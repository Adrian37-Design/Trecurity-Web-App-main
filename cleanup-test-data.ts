
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity',
        },
    },
});

async function main() {
    console.log("=== CHECKING FOR TEST DATA ===\n");

    const vehiclesToDelete = ['TEST-SYNC-001', 'TEST-MILEAGE-001'];
    const companiesToDelete = ['test-sync@test.com', 'test-mileage@test.com'];

    // 1. Delete Test Vehicles & Related Data
    for (const plate of vehiclesToDelete) {
        const vehicle = await prisma.vehicle.findUnique({ where: { number_plate: plate } });
        if (vehicle) {
            console.log(`Found test vehicle: ${plate}`);

            // Delete related data first
            const deletedTracking = await prisma.trackingData.deleteMany({ where: { vehicle_id: vehicle.id } });
            console.log(`- Deleted ${deletedTracking.count} tracking points`);

            // Delete vehicle
            await prisma.vehicle.delete({ where: { id: vehicle.id } });
            console.log(`- Deleted vehicle: ${plate}`);
        } else {
            console.log(`Test vehicle not found (already deleted): ${plate}`);
        }
    }

    // 2. Delete Test Companies
    for (const email of companiesToDelete) {
        const company = await prisma.company.findUnique({ where: { email: email } });
        if (company) {
            console.log(`Found test company: ${email}`);
            // Check if it has other vehicles? (Shouldn't if we deleted them above)
            const vehicleCount = await prisma.vehicle.count({ where: { company_id: company.id } });
            if (vehicleCount === 0) {
                await prisma.company.delete({ where: { id: company.id } });
                console.log(`- Deleted company: ${email}`);
            } else {
                console.warn(`- SKIPPING company ${email} because it still has ${vehicleCount} vehicles.`);
            }
        } else {
            console.log(`Test company not found: ${email}`);
        }
    }

    console.log("\n=== CLEANUP COMPLETE ===");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
