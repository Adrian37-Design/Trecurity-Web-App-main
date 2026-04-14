
import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
    const email = 'netrozim@gmail.com';

    // Safety check: Require a secret key in query to prevent abuse if discovered
    const { key } = getQuery(event);
    if (key !== 'upgrade_me_now_please_123') {
        return { success: false, message: 'Invalid key' };
    }

    try {
        const user = await prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            return { success: false, message: 'User not found' };
        }

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { approval_level: 'MASTER_ADMIN' }
        });

        return {
            success: true,
            message: `User ${updated.email} upgraded to ${updated.approval_level}`,
            user: updated
        };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
});
