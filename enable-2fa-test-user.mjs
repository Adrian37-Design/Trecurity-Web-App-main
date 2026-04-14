import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity'
        }
    }
});

async function enableTwoFactor() {
    try {
        const user = await prisma.user.update({
            where: { email: 'test@example.com' },
            data: { two_factor_auth: true },
            select: { email: true, two_factor_auth: true }
        });

        console.log('✅ 2FA enabled for test@example.com:', user);
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

enableTwoFactor();
