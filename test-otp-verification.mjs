import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity'
        }
    }
});

async function testOTPVerification() {
    try {
        const otps = await prisma.oneTimePin.findMany({
            where: {
                email: 'test@example.com',
                expires_at: { gte: new Date() }
            },
            orderBy: { created_at: 'desc' },
            take: 1
        });

        if (otps.length === 0) {
            console.log('❌ No valid (non-expired) OTP found');
            return;
        }

        const otp = otps[0];
        console.log('📋 Latest OTP entry:');
        console.log('  - ID:', otp.id);
        console.log('  - Email:', otp.email);
        console.log('  - Created:', otp.created_at);
        console.log('  - Expires:', otp.expires_at);
        console.log('  - Used:', otp.has_been_used);
        console.log('  - Failed attempts:', otp.failed_attempts);

        // Test verification with the hardcoded PIN
        const testPin = '123456';
        console.log('\n🔍 Testing verification with PIN:', testPin);

        try {
            const isValid = await argon2.verify(otp.pin, testPin);
            console.log('✅ Verification result:', isValid);

            if (!isValid) {
                console.log('❌ HASH MISMATCH! The stored hash does not match "123456"');
                console.log('   This means send-otp.ts may have generated a different OTP.');
            }
        } catch (error) {
            console.log('❌ Argon2 verification error:', error.message);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testOTPVerification();
