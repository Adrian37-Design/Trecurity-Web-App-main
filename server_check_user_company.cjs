const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'adriantakudzwa7337@gmail.com';
    console.log(`Searching for user: ${email}`);

    const user = await prisma.user.findFirst({
        where: { email: email },
        include: {
            companies_managed: true,
            companies_joined: true,
            company_where_user_is_admin: true,
            company_where_user_is_customer: true,
            vehicles: true
        }
    });

    if (!user) {
        console.log('User not found!');
        return;
    }

    console.log('User Found:', user.id);
    console.log('Approval Level:', user.approval_level);
    console.log('Legacy Admin ID:', user.company_where_user_is_admin_id);
    console.log('Legacy Customer ID:', user.company_where_user_is_customer_id);
    console.log('Companies Managed:', user.companies_managed.map(c => c.name));
    console.log('Companies Joined:', user.companies_joined.map(c => c.name));
    console.log('Assigned Vehicles:', user.vehicles.map(v => v.number_plate));

    if (user.company_where_user_is_customer_id) {
        const legacyComp = await prisma.company.findUnique({ where: { id: user.company_where_user_is_customer_id } });
        console.log('Legacy Customer Company:', legacyComp ? legacyComp.name : 'NOT FOUND');
    }

}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
