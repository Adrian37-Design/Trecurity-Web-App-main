
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.logs.count();
        console.log(`Total Logs: ${count}`);

        if (count > 0) {
            const logs = await prisma.logs.findMany({
                take: 5,
                orderBy: { created_at: 'desc' },
                include: { user: { select: { email: true, approval_level: true } } }
            });
            console.log('Latest 5 Logs:');
            console.log(JSON.stringify(logs, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
