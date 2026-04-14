
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging User-Company Relations ---');

    const users = await prisma.user.findMany({
        include: {
            companies_managed: true,
            companies_joined: true,
            company_where_user_is_admin: true,
            company_where_user_is_customer: true
        }
    });

    console.log(`Total Users: ${users.length}`);

    let multiCompanyUsers = 0;

    for (const u of users) {
        const user = u as any;
        const managedCount = user.companies_managed ? user.companies_managed.length : 0;
        const joinedCount = user.companies_joined ? user.companies_joined.length : 0;
        const total = managedCount + joinedCount;

        if (total > 0) { // Log everyone with at least 1 relation to be sure
            if (total > 1) multiCompanyUsers++;

            console.log(`\nUser: ${user.email} (${user.approval_level})`);
            console.log(`- Companies Managed (${managedCount}): ${user.companies_managed?.map((c: any) => c.name).join(', ')}`);
            console.log(`- Companies Joined (${joinedCount}): ${user.companies_joined?.map((c: any) => c.name).join(', ')}`);
            console.log(`- Legacy Admin ID: ${user.company_where_user_is_admin_id}`);
            console.log(`- Legacy Customer ID: ${user.company_where_user_is_customer_id}`);
        }
    }

    if (multiCompanyUsers === 0) {
        console.log('\n❌ NO users found with > 1 company. The frontend dropdown will NOT show for anyone.');
    } else {
        console.log(`\n✅ Found ${multiCompanyUsers} users with multiple companies.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
