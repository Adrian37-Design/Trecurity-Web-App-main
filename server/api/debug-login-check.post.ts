
import { prisma } from "~/prisma/db";
import argon2 from 'argon2';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    let { email, password } = body;

    const logs = [];
    logs.push(`📥 Received: Email='${email}', Password='${password}'`);

    // 1. Normalization
    const originalEmail = email;
    if (email) email = email.trim().toLowerCase();
    if (password) password = password.trim();

    logs.push(`🔄 Normalized: Email='${email}', Password='${password}'`);
    if (originalEmail !== email) logs.push(`⚠️  Email was modified during normalization!`);

    try {
        // 2. Find User
        logs.push(`🔍 Searching DB for email: '${email}'...`);
        const user = await prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            logs.push("❌ User NOT FOUND in database.");
            // Check if user exists with different casing?
            const anyUser = await prisma.user.findFirst({
                where: { email: { equals: email, mode: 'insensitive' } }
            });
            if (anyUser) {
                logs.push(`⚠️  Found user with insensitive search: ${anyUser.email}. DB likely has mixed case.`);
            }
            return { success: false, logs };
        }

        logs.push(`✅ User found: ID=${user.id}, Name=${user.name}, Status=${user.status}`);
        logs.push(`🔒 Stored Hash prefix: ${user.password.substring(0, 15)}...`);

        // 3. Verify Password
        logs.push(`🔐 Verifying Argon2 hash...`);
        const isValid = await argon2.verify(user.password, password);

        if (isValid) {
            logs.push("✅ PASSWORD MATCH! Login should succeed.");
        } else {
            logs.push("❌ PASSWORD MISMATCH!");

            // Debugging hints
            if (password.includes(" ")) logs.push("⚠️ Input password contains spaces.");
            if (password.length !== 16) logs.push(`⚠️ Input password length is ${password.length} (expected 16 for random pass?)`);
        }

        return { success: isValid, logs };

    } catch (e) {
        logs.push(`💥 Exception: ${e}`);
        return { success: false, logs };
    }
});
