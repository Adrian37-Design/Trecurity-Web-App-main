
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = "admin@gmail.com"; // Assuming this is the master admin, or I should find one.

    console.log(`1. Finding Master Admin user...`);
    const user = await prisma.user.findFirst({
        where: { approval_level: 'MASTER_ADMIN' }
    });

    if (!user) {
        console.log("No MASTER_ADMIN found.");
        return;
    }
    console.log(`Found Master Admin: ${user.email} (${user.id})`);

    console.log(`\n2. Simulating 'data-table' Query (No Filters)...`);
    // This mimics the logic in data-table.get.ts for Master Admin (empty where)
    const allCompanies = await prisma.company.findMany({
        select: { id: true, name: true, status: true }
    });

    console.log(`Total Companies in DB: ${allCompanies.length}`);
    console.log("Listing first 10:");
    console.table(allCompanies.slice(0, 10));

    console.log(`\n3. Checking SUPER_ADMIN logic for comparison...`);
    // If logic was mistaken and applied super admin filter:
    if (user.company_where_user_is_admin_id) {
        const restricted = await prisma.company.findMany({
            where: {
                OR: [
                    { id: user.company_where_user_is_admin_id },
                    { parent_company_id: user.company_where_user_is_admin_id }
                ]
            },
            select: { id: true, name: true }
        });
        console.log(`If treated as SUPER_ADMIN, would see: ${restricted.length} companies.`);
    } else {
        console.log("User has no company_where_user_is_admin_id, so SUPER_ADMIN filter would default to empty (or crash logic depending on impl).");
    }

}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
