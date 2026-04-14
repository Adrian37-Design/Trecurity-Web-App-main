import { PrismaClient, ApprovalLevel } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity',
        },
    },
});

async function main() {
    const email = 'test@example.com';
    const password = 'testpass123';
    const hashedPassword = await argon2.hash(password);

    console.log(`Connecting to DB...`);

    // Delete existing test user if exists
    try {
        const deleted = await prisma.user.deleteMany({ where: { email } });
        console.log(`Deleted ${deleted.count} existing users.`);
    } catch (e) {
        console.log("Delete failed:", e.message);
    }

    // Create test user
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name: 'Test',
            surname: 'User',
            phone: '+263787964160',
            approval_level: ApprovalLevel.SUPER_ADMIN,
            two_factor_auth: false, // SKIP OTP for easy testing
        },
    });

    console.log('✅ Test user created!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);

    await prisma.$disconnect();
}

main().catch(e => {
    console.error("FATAL ERROR:", e);
    process.exit(1);
});
