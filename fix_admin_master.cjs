// Fix admin@gmail.com - assign to a company or make MASTER_ADMIN
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function fixAdminLogin() {
    try {
        const email = 'admin@gmail.com';

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                companies_managed: true,
                company_where_user_is_admin: true
            }
        });

        if (!user) {
            console.log('❌ User not found');
            return;
        }

        console.log(`Found user: ${user.email}`);
        console.log(`Current role: ${user.approval_level}`);
        console.log(`Companies managed: ${user.companies_managed?.length || 0}`);

        // Solution: Make them MASTER_ADMIN (doesn't need company assignment)
        const hash = await argon2.hash('password');

        const updated = await prisma.user.update({
            where: { email },
            data: {
                password: hash,
                approval_level: 'MASTER_ADMIN', // Change to MASTER_ADMIN
                status: true,
                is_locked: false,
                login_failed_attempts: 0
            }
        });

        console.log('\n✅ Updated admin@gmail.com:');
        console.log(`Role: ${updated.approval_level}`);
        console.log(`Status: ${updated.status ? 'ENABLED' : 'DISABLED'}`);
        console.log(`Locked: ${updated.is_locked ? 'YES' : 'NO'}`);
        console.log('\nPassword: "password"');
        console.log('\n✅ Login should now work!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

fixAdminLogin();
