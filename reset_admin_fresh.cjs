// Complete reset of admin@gmail.com account
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function resetAdminAccount() {
    try {
        const email = 'admin@gmail.com';

        // Delete existing account
        await prisma.user.deleteMany({
            where: { email }
        });

        console.log('✅ Deleted old admin@gmail.com account');

        // Create fresh account with clean data
        const hash = await argon2.hash('password');

        const user = await prisma.user.create({
            data: {
                email: email,
                name: 'Admin',
                surname: 'User',
                phone: '0000000000',
                password: hash,
                approval_level: 'MASTER_ADMIN',
                status: true,
                is_locked: false,
                login_failed_attempts: 0
            }
        });

        console.log('\n✅ Created fresh admin@gmail.com account');
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.approval_level}`);
        console.log(`Password: "password"`);
        console.log('\n✅ Login should now work!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

resetAdminAccount();
