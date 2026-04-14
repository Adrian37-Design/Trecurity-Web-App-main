import { prisma } from "~~/prisma/db";

export default defineEventHandler(async (event) => {
    const { secret } = getQuery(event);
    if (secret !== 'debug_trecurity_2024') return { error: 'Unauthorized' };

    try {
        const count = await prisma.logs.count();
        const logs = await prisma.logs.findMany({
            take: 10,
            orderBy: { created_at: 'desc' },
            include: { user: { select: { email: true, id: true, approval_level: true } } }
        });
        return {
            success: true,
            total_logs: count,
            sample_logs: logs
        };
    } catch (e: any) {
        return {
            success: false,
            error: e.message,
            stack: e.stack
        };
    }
});
