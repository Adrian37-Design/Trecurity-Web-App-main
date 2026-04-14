// Compare admin@gmail.com vs working account to find issue
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareAccounts() {
    try {
        const adminAccount = await prisma.user.findUnique({
            where: { email: 'admin@gmail.com' },
            include: {
                companies_managed: true,
                companies_joined: true,
                company_where_user_is_admin: true,
                company_where_user_is_customer: true
            }
        });

        const workingAccount = await prisma.user.findUnique({
            where: { email: 'adriankwaramba@gmail.com' },
            include: {
                companies_managed: true,
                companies_joined: true,
                company_where_user_is_admin: true,
                company_where_user_is_customer: true
            }
        });

        console.log('\n=== admin@gmail.com (BROKEN) ===');
        console.log('approval_level:', adminAccount.approval_level);
        console.log('status:', adminAccount.status);
        console.log('is_locked:', adminAccount.is_locked);
        console.log('two_factor_auth:', adminAccount.two_factor_auth);
        console.log('companies_managed:', adminAccount.companies_managed?.length || 0);
        console.log('companies_joined:', adminAccount.companies_joined?.length || 0);
        console.log('company_where_user_is_admin_id:', adminAccount.company_where_user_is_admin_id);
        console.log('company_where_user_is_customer_id:', adminAccount.company_where_user_is_customer_id);

        console.log('\n=== adriankwaramba@gmail.com (WORKING) ===');
        console.log('approval_level:', workingAccount.approval_level);
        console.log('status:', workingAccount.status);
        console.log('is_locked:', workingAccount.is_locked);
        console.log('two_factor_auth:', workingAccount.two_factor_auth);
        console.log('companies_managed:', workingAccount.companies_managed?.length || 0);
        console.log('companies_joined:', workingAccount.companies_joined?.length || 0);
        console.log('company_where_user_is_admin_id:', workingAccount.company_where_user_is_admin_id);
        console.log('company_where_user_is_customer_id:', workingAccount.company_where_user_is_customer_id);

        console.log('\n=== DIFFERENCES ===');
        if (adminAccount.two_factor_auth !== workingAccount.two_factor_auth) {
            console.log('⚠️ two_factor_auth differs!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

compareAccounts();
