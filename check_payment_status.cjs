
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPayment() {
    try {
        console.log("Checking recent payments...");
        const payments = await prisma.subscriptionPayment.findMany({
            orderBy: { created_at: 'desc' },
            take: 3
        });

        console.log("Recent Payments:");
        payments.forEach(p => {
            console.log(`- ID: ${p.id}, Amount: ${p.amount} ${p.currency}, Status: ${p.status}, Created: ${p.created_at}`);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

checkPayment();
