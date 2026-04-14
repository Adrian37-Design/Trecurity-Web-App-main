// Fix admin@gmail.com login issue
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function fixAdminLogin() {
    try {
        const email = 'admin@gmail.com';

        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.log('❌ User not found - Creating admin account...');

            // Create admin user with password "password"
            const hash = await argon2.hash('password');

            user = await prisma.user.create({
                data: {
                    email: email,
                    name: 'Admin',
                    surname: 'User',
                    phone: '000000000',
                    password: hash,
                    approval_level: 'SUPER_ADMIN',
                    status: true,
                    is_locked: false
                }
            });

            console.log('✅ Created admin account');
        } else {
            console.log('📋 User exists - resetting password and unlocking...');

            // Reset password and unlock account
            const hash = await argon2.hash('password');

            user = await prisma.user.update({
                where: { email },
                data: {
                    password: hash,
                    status: true,
                    is_locked: false,
                    login_attempts: 0
                }
            });

            console.log('✅ Reset password to "password" and unlocked account');
        }

        console.log('\n📋 Account details:');
        console.log(`Email: ${user.email}`);
        console.log(`Name: ${user.name} ${user.surname}`);
        console.log(`Role: ${user.approval_level}`);
        console.log(`Status: ${user.status ? '✅ ENABLED' : '❌ DISABLED'}`);
        console.log(`Locked: ${user.is_locked ? '🔒 YES' : '🔓 NO'}`);
        console.log('\n✅ Login should now work with password: "password"');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

fixAdminLogin();
