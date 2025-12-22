import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const createTestUser = async () => {
    const email = 'test@example.com';
    const password = 'testpass123';
    const hashedPassword = await argon2.hash(password);

    // Delete existing test user if exists
    await prisma.user.deleteMany({ where: { email } });

    // Create test user with all required fields
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name: 'Test',
            surname: 'User',
            phone: '+263787964160',
            approval_level: 'SUPER_ADMIN',
        },
    });

    console.log('✅ Test user created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🔢 OTP: 123456');

    await prisma.$disconnect();
};

createTestUser().catch(console.error);
