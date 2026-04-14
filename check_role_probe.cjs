const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRole() {
    try {
        const email = 'adriantakudzwa7337@gmail.com';
        const user = await prisma.user.findUnique({
            where: { email: email },
            select: { id: true, name: true, surname: true, email: true, approval_level: true }
        });

        console.log('User Role Probe Method:', JSON.stringify(user, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkRole();
