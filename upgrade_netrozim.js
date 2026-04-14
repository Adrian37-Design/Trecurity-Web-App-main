
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'netrozim@gmail.com';
    console.log(`Checking user: ${email}...`);

    const user = await prisma.user.findFirst({
        where: { email: email.trim() }
    })

    if (!user) {
        console.log('ERROR: User not found!');
        return;
    }

    console.log(`Current Level: ${user.approval_level}`);

    if (user.approval_level === 'MASTER_ADMIN') {
        console.log('User is already MASTER_ADMIN.');
        return;
    }

    console.log('Upgrading to MASTER_ADMIN...');
    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { approval_level: 'MASTER_ADMIN' }
    });

    console.log(`SUCCESS: User ${updated.email} is now ${updated.approval_level}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect())
