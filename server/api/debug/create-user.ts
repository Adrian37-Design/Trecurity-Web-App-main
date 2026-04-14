import { prisma } from "~/prisma/db";
import argon2 from "argon2";
import { ApprovalLevel } from "@prisma/client";

export default defineEventHandler(async (event) => {
    try {
        const email = 'test@example.com';
        const password = 'testpass123';
        const hashedPassword = await argon2.hash(password);

        // Check if exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            // Force update password to be sure and disable 2FA
            await prisma.user.update({
                where: { email },
                data: {
                    password: hashedPassword,
                    approval_level: ApprovalLevel.SUPER_ADMIN,
                    two_factor_auth: false
                }
            });
            return { success: true, message: "User updated", user: existing };
        }

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: 'Test',
                surname: 'User',
                phone: '+263787964160',
                approval_level: ApprovalLevel.SUPER_ADMIN,
                two_factor_auth: false
            }
        });

        return { success: true, user };
    } catch (e) {
        return { success: false, error: String(e) };
    }
});
