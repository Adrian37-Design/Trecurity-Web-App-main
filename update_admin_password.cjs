// Update admin@gmail.com password with fresh hash
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function updateAdminPassword() {
    try {
        const email = 'admin@gmail.com';
        const newPassword = 'Admin@2024!';  // Stronger password

        // Create fresh hash
        const hash = await argon2.hash(newPassword);

        // Update account
        const user = await prisma.user.update({
            where: { email },
            data: {
                password: hash,
                status: true,
                is_locked: false,
                login_failed_attempts: 0
            }
        });

        console.log('\n✅ Updated admin@gmail.com');
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.approval_level}`);
        console.log(`New Password: "${newPassword}"`);
        console.log('\n✅ Try logging in now!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

updateAdminPassword();
