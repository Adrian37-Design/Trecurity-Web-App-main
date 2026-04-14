const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Find NETRO MOTORS
        const company = await prisma.company.findFirst({
            where: {
                name: {
                    contains: 'NETRO',
                    mode: 'insensitive'
                }
            }
        });

        if (!company) {
            console.log("Company not found");
            return;
        }

        console.log(`\n=== Company: ${company.name} (${company.id}) ===\n`);

        // Find all company admins for this company
        const companyAdmins = await prisma.user.findMany({
            where: {
                OR: [
                    { company_where_user_is_admin_id: company.id },
                    { company_where_user_is_customer_id: company.id }
                ],
                approval_level: 'COMPANY_ADMIN',
                status: true
            },
            select: {
                id: true,
                email: true,
                name: true,
                surname: true,
                approval_level: true
            }
        });

        console.log(`Found ${companyAdmins.length} users with COMPANY_ADMIN role:\n`);
        companyAdmins.forEach(u => {
            console.log(`  - ${u.name} ${u.surname} (${u.email})`);
        });

        // Find Adrian
        const adrian = companyAdmins.find(u =>
            u.name.toLowerCase().includes('adrian') ||
            u.email.toLowerCase().includes('adrian')
        );

        if (!adrian) {
            console.log("\n❌ Could not find Adrian in the list. Aborting.");
            return;
        }

        console.log(`\n✓ Identified Adrian: ${adrian.name} ${adrian.surname} (${adrian.email})`);

        // Get the others who should be changed to USER
        const toChange = companyAdmins.filter(u => u.id !== adrian.id);

        if (toChange.length === 0) {
            console.log("\n✓ No other users to change. Adrian is already the only COMPANY_ADMIN.");
            return;
        }

        console.log(`\n⚠ Will change ${toChange.length} users from COMPANY_ADMIN to USER:`);
        toChange.forEach(u => {
            console.log(`  - ${u.name} ${u.surname} (${u.email})`);
        });

        // Update them
        const result = await prisma.user.updateMany({
            where: {
                id: {
                    in: toChange.map(u => u.id)
                }
            },
            data: {
                approval_level: 'USER'
            }
        });

        console.log(`\n✅ Successfully updated ${result.count} users to USER role.`);

        // Verify
        const remainingAdmins = await prisma.user.count({
            where: {
                OR: [
                    { company_where_user_is_admin_id: company.id },
                    { company_where_user_is_customer_id: company.id }
                ],
                approval_level: 'COMPANY_ADMIN',
                status: true
            }
        });

        console.log(`\n📊 Final count: ${remainingAdmins} COMPANY_ADMIN(s) for ${company.name}`);

    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
