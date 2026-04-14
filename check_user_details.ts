
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'adriantakudzwa7337@gmail.com';
    console.log(`Checking user: ${email}...`);

    const user = await prisma.user.findFirst({
        where: { email: email.trim() }, // Ensure trim matches login logic
        include: {
            companies_managed: true,
            company_where_user_is_admin: true,
            company_where_user_is_customer: true,
        }
    })

    if (!user) {
        console.log('USER NOT FOUND');
        return;
    }

    console.log('--- USER DETAILS ---');
    console.log(`ID: ${user.id}`);
    console.log(`Approval Level: ${user.approval_level}`);
    console.log(`Legacy Admin ID: ${user.company_where_user_is_admin_id}`);
    console.log(`Legacy Customer ID: ${user.company_where_user_is_customer_id}`);

    console.log(`Companies Managed (New Relation):`);
    if (user.companies_managed.length > 0) {
        user.companies_managed.forEach(c => console.log(` - ${c.name} (${c.id})`));
    } else {
        console.log(' - None');
    }

    console.log(`Legacy Admin Company:`);
    if (user.company_where_user_is_admin) {
        const c = user.company_where_user_is_admin;
        // Handle singular or array if schema differs (schema says Company?, singular)
        console.log(` - ${c.name} (${c.id})`);
    } else {
        console.log(' - None');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
