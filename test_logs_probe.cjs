
// Ensure we can read .env
try { require('dotenv').config(); } catch (e) { /* ignore if missing, env might be loaded by system */ }

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.logs.count();
        console.log(`[SUCCESS] Total Logs Found: ${count}`);

        if (count > 0) {
            const logs = await prisma.logs.findMany({
                take: 3,
                orderBy: { created_at: 'desc' },
                include: { user: { select: { email: true, approval_level: true } } }
            });
            console.log('[INFO] Latest 3 Logs:');
            console.log(JSON.stringify(logs, null, 2));
        } else {
            console.log('[WARN] Log table is empty.');
        }
    } catch (e) {
        console.error('[ERROR] Database Query Failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
