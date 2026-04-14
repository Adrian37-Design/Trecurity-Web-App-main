
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
    console.log('--- Force Syncing User-Company Relations ---');

    const users = await prisma.user.findMany();
    console.log(`Processing ${users.length} users...`);

    let updatedCount = 0;

    for (const user of users) {
        let updateData: any = {};
        let needsUpdate = false;

        // Sync Admin Relation
        if (user.approval_level === 'COMPANY_ADMIN' || user.approval_level === 'SUPER_ADMIN') {
            const adminId = user.company_where_user_is_admin_id;
            if (adminId) {
                // Check if already linked (optional, but connect is safe)
                // accessing relation here requires include.
                // Simplified: just update.
                updateData.companies_managed = { connect: { id: adminId } };
                needsUpdate = true;
            }
        }

        // Sync Customer Relation
        if (user.approval_level === 'USER') {
            const customerId = user.company_where_user_is_customer_id;
            if (customerId) {
                updateData.companies_joined = { connect: { id: customerId } };
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            try {
                await prisma.user.update({
                    where: { id: user.id },
                    data: updateData
                });
                process.stdout.write('.');
                updatedCount++;
            } catch (e) {
                console.error(`\nFailed to update user ${user.email}:`, e);
            }
        }
    }

    console.log(`\n✅ Sync Complete. Updated ${updatedCount} users.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
