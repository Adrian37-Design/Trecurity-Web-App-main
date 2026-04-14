
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    let output = '';
    try {
        const count = await prisma.logs.count();
        output += `Total Logs in DB: ${count}\n`;

        if (count > 0) {
            const logs = await prisma.logs.findMany({
                take: 5,
                orderBy: { created_at: 'desc' },
                include: { user: { select: { email: true, approval_level: true, id: true } } }
            });
            output += 'Latest 5 Logs:\n';
            output += JSON.stringify(logs, null, 2);
        } else {
            output += 'No logs found in DB.\n';
        }
    } catch (e) {
        output += `Error: ${e.message}\n`;
        console.error(e);
    } finally {
        await prisma.$disconnect();
        fs.writeFileSync('log_debug_output.txt', output);
    }
}

main();
