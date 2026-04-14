
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const emails = ['adriankwaramba@gmail.com', 'netrozim@gmail.com'];

    console.log('--- COMPARING ADMINS ---');

    for (const email of emails) {
        const user = await prisma.user.findFirst({
            where: { email: email },
            include: {
                company_where_user_is_admin: true,
                company_where_user_is_customer: true,
                companies_managed: true,
                companies_joined: true
            }
        });

        if (user) {
            console.log(`\nUSER: ${user.email}`);
            console.log(`ID: ${user.id}`);
            console.log(`Role: ${user.approval_level}`);
            console.log(`Company Admin ID: ${user.company_where_user_is_admin_id}`);
            console.log(`Customer ID: ${user.company_where_user_is_customer_id}`);
            console.log(`Companies Managed (Relation): ${user.companies_managed.length} -> ${user.companies_managed.map(c => c.name).join(', ')}`);
            console.log(`Companies Joined (Relation): ${user.companies_joined.length} -> ${user.companies_joined.map(c => c.name).join(', ')}`);
        } else {
            console.log(`\nUser ${email} not found.`);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect())
