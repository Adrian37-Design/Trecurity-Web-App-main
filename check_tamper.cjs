
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const violation = await prisma.violation.findFirst({
        where: { type: 'BATTERY_TAMPER' },
        orderBy: { created_at: 'desc' }
    });

    if (violation) {
        console.log('✅ Found Battery Tamper Violation:', violation.id);
        console.log('Time:', violation.created_at);
    } else {
        console.log('❌ No Battery Tamper violations found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
