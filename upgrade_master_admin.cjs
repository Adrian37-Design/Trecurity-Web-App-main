// Upgrade adriankwaramba@gmail.com to MASTER_ADMIN
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function upgradeToMasterAdmin() {
    try {
        const email = 'adriankwaramba@gmail.com';

        const result = await prisma.user.updateMany({
            where: {
                email: email
            },
            data: {
                approval_level: 'MASTER_ADMIN'
            }
        });

        console.log(`✅ Updated ${result.count} user(s)`);

        // Verify the update
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                surname: true,
                approval_level: true,
                status: true
            }
        });

        console.log('\n📋 User details:');
        console.log(`Email: ${user.email}`);
        console.log(`Name: ${user.name} ${user.surname}`);
        console.log(`Role: ${user.approval_level}`);
        console.log(`Status: ${user.status ? 'ENABLED' : 'DISABLED'}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

upgradeToMasterAdmin();
