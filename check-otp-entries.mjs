import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity'
        }
    }
});

async function checkOTP() {
    try {
        const otps = await prisma.oneTimePin.findMany({
            where: { email: 'test@example.com' },
            orderBy: { created_at: 'desc' },
            take: 5
        });

        console.log('📋 Recent OTPs for test@example.com:', JSON.stringify(otps, null, 2));

        if (otps.length === 0) {
            console.log('❌ NO OTPs found! The sendOTP function may not have been called.');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkOTP();
