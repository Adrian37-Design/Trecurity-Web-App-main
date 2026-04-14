
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // 1. Find a valid vehicle
        const vehicle = await prisma.vehicle.findFirst();
        if (!vehicle) {
            console.log('No vehicles found to test with.');
            return;
        }
        console.log(`Testing with Vehicle: ${vehicle.number_plate} (ID: ${vehicle.id})`);

        // 2. Create a BATTERY_TAMPER violation
        // This mimics what the backend controller does, but we verify the Type works
        const violation = await prisma.violation.create({
            data: {
                vehicle_id: vehicle.id,
                company_id: vehicle.company_id,
                type: 'BATTERY_TAMPER', // The new enum value
                data: {
                    lat: -17.82,
                    lon: 31.05,
                    speed: 0,
                    satellites: 10,
                    hdop: 1,
                    course: 0,
                    description: "Simulated Battery Disconnnect"
                }
            }
        });

        console.log('✅ Success! Created Violation:', violation.id);
        console.log('Type:', violation.type);
        console.log('Data:', JSON.stringify(violation.data));

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
