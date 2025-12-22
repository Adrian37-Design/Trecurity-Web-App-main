import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const fixTestUser = async () => {
    // Create a test company with all required fields
    const company = await prisma.company.create({
        data: {
            name: 'Test Company Ltd',
            email: 'company@test.com',
            phone: '+263787964160'
        },
    });

    console.log('✅ Company created:', company.id);

    // Update test user to be admin of this company
    await prisma.user.update({
        where: { email: 'test@example.com' },
        data: {
            company_where_user_is_admin_id: company.id
        },
    });

    console.log('✅ Test user linked to company');
    console.log('\n📌 Please log out and log in again for changes to take effect!');

    await prisma.$disconnect();
};

fixTestUser().catch(console.error);
