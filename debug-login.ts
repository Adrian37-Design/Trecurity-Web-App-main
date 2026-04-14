
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

const debugLogin = async () => {
    const email = "adriantakudzwa7337@gmail.com";
    const password = "GuIvEX801VrU2G5q";

    console.log(`🔍 Debugging login for: ${email}`);
    console.log(`🔑 Testing password: '${password}'`);

    try {
        const user = await prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            console.error("❌ User not found in database!");
            return;
        }

        console.log(`✅ User found: ${user.name} ${user.surname} (${user.id})`);
        console.log(`🔒 Stored Hash: ${user.password.substring(0, 20)}...`);

        const isValid = await argon2.verify(user.password, password);

        console.log("---------------------------------------------------");
        if (isValid) {
            console.log("✅ SUCCESS: The password matches the stored hash.");
        } else {
            console.log("❌ FAILURE: The password does NOT match the stored hash.");

            // Try trimming
            const trimmedPassword = password.trim();
            const isValidTrimmed = await argon2.verify(user.password, trimmedPassword);
            if (isValidTrimmed) {
                console.log("⚠️  PARTIAL SUCCESS: Login works if password is trimmed!");
            }
        }
        console.log("---------------------------------------------------");

    } catch (e) {
        console.error("Error during debug:", e);
    } finally {
        await prisma.$disconnect();
    }
}

debugLogin();
