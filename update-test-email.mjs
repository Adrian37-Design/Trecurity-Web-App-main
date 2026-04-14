import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity'
        }
    }
});

async function updateEmail() {
    try {
        const user = await prisma.user.update({
            where: { email: 'test@example.com' },
            data: { email: 'adriankwaramba@gmail.com' },
            select: {
                email: true,
                two_factor_auth: true,
                name: true,
                surname: true
            }
        });

        console.log('✅ Email updated successfully:', user);
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

updateEmail();
