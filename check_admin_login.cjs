// Check admin@gmail.com account status
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminAccount() {
    try {
        const email = 'admin@gmail.com';

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                surname: true,
                approval_level: true,
                status: true,
                is_locked: true,
                login_attempts: true,
                created_at: true
            }
        });

        if (!user) {
            console.log('❌ User not found');
            console.log('The user admin@gmail.com does not exist in the database');
        } else {
            console.log('📋 User details:');
            console.log(`Email: ${user.email}`);
            console.log(`Name: ${user.name} ${user.surname}`);
            console.log(`Role: ${user.approval_level}`);
            console.log(`Status: ${user.status ? '✅ ENABLED' : '❌ DISABLED'}`);
            console.log(`Locked: ${user.is_locked ? '🔒 YES' : '🔓 NO'}`);
            console.log(`Login attempts: ${user.login_attempts || 0}`);
            console.log(`Created: ${user.created_at}`);

            if (!user.status) {
                console.log('\n⚠️  ISSUE: Account is DISABLED');
            }
            if (user.is_locked) {
                console.log('\n⚠️  ISSUE: Account is LOCKED');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdminAccount();
