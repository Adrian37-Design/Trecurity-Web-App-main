
import { prisma } from "~/prisma/db";
import argon2 from 'argon2';

export default defineEventHandler(async (event) => {
    const email = "adriantakudzwa7337@gmail.com";
    const password = "GuIvEX801VrU2G5q";

    const logs = [];
    logs.push(`🔍 Debugging login for: ${email}`);
    logs.push(`🔑 Testing password: '${password}'`);

    try {
        const user = await prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            return {
                message: "❌ User not found in database!",
                logs
            };
        }

        logs.push(`✅ User found: ${user.name} ${user.surname} (${user.id})`);
        logs.push(`🔒 Stored Hash: ${user.password.substring(0, 20)}...`);
        logs.push(`🔒 Hash Length: ${user.password.length}`);

        const isValid = await argon2.verify(user.password, password);

        if (isValid) {
            logs.push("✅ SUCCESS: The password matches the stored hash.");
        } else {
            logs.push("❌ FAILURE: The password does NOT match the stored hash.");

            // Try trimming
            const trimmedPassword = password.trim();
            const isValidTrimmed = await argon2.verify(user.password, trimmedPassword);
            if (isValidTrimmed) {
                logs.push("⚠️  PARTIAL SUCCESS: Login works if password is trimmed!");
            }
        }

        return {
            success: isValid,
            logs
        };

    } catch (e) {
        return {
            error: String(e),
            logs
        };
    }
});
