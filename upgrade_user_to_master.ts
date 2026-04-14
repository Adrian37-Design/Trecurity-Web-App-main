
import { PrismaClient } from '@prisma/client'
import fs from 'fs';

const prisma = new PrismaClient()

async function log(msg: string) {
    console.log(msg);
    fs.appendFileSync('upgrade_status.txt', msg + '\n');
}

async function main() {
    fs.writeFileSync('upgrade_status.txt', 'Starting...\n');
    const email = 'netrozim@gmail.com';
    await log(`Checking user: ${email}...`);

    const user = await prisma.user.findFirst({
        where: { email: email.trim() }
    })

    if (!user) {
        await log('ERROR: User not found!');
        return;
    }

    await log(`Current Level: ${user.approval_level}`);

    if (user.approval_level === 'MASTER_ADMIN') {
        await log('User is already MASTER_ADMIN.');
        return;
    }

    await log('Upgrading to MASTER_ADMIN...');
    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { approval_level: 'MASTER_ADMIN' }
    });

    await log(`SUCCESS: User ${updated.email} is now ${updated.approval_level}`);
}

main()
    .catch(async e => {
        console.error(e);
        await log(`ERROR: ${e.message}`);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect())
