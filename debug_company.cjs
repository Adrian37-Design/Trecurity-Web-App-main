const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("--- Searching for Company 'Netro Motors' ---");
        const companies = await prisma.company.findMany({
            where: {
                name: {
                    contains: 'Netro',
                    mode: 'insensitive'
                }
            }
        });
        console.log(`Found ${companies.length} companies:`);
        companies.forEach(c => console.log(`[${c.id}] ${c.name}`));

        if (companies.length === 0) {
            console.log("No company found. Exiting.");
            return;
        }

        const companyId = companies[0].id;
        console.log(`\n--- Inspecting Company: ${companies[0].name} (${companyId}) ---`);

        // Check Users
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { company_where_user_is_admin_id: companyId },
                    { company_where_user_is_customer_id: companyId }
                ]
            },
            select: { id: true, email: true, name: true, approval_level: true, company_where_user_is_admin_id: true }
        });
        console.log(`\nUsers Linked to this Company (${users.length}):`);
        users.forEach(u => console.log(`- ${u.email} (${u.approval_level}) | AdminFor: ${u.company_where_user_is_admin_id}`));

        // Check Vehicles
        const vehicles = await prisma.vehicle.findMany({
            where: { company_id: companyId },
            select: { id: true, number_plate: true, company_id: true }
        });
        console.log(`\nVehicles Linked to this Company (${vehicles.length}):`);
        vehicles.forEach(v => console.log(`- ${v.number_plate} (CoID: ${v.company_id})`));

        // Check ALL Vehicles to see if they belong to another company
        if (vehicles.length === 0) {
            console.log("\n(Checking generic vehicle connection...)");
            const sample = await prisma.vehicle.findMany({ take: 3, select: { number_plate: true, company: { select: { name: true, id: true } } } });
            sample.forEach(s => console.log(`Sample: ${s.number_plate} belongs to ${s.company.name} (${s.company.id})`));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
