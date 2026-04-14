import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity',
        },
    },
});

async function main() {
    console.log("Checking users...");
    try {
        const users = await prisma.user.findMany({
            take: 5,
            select: { email: true, id: true, approval_level: true }
        });
        console.log('✅ Users found:', users.length);
        users.forEach(u => console.log(` - ${u.email} (${u.approval_level})`));
    } catch (e) {
        console.error("❌ Error listing users:", e);
    }
}

main();
