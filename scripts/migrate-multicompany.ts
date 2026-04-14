
import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Starting Multi-Company Migration ---");

    // Migrate Admins
    const admins = await prisma.user.findMany({
        where: {
            AND: [
                { company_where_user_is_admin_id: { not: null } },
                // Optional: Filter those not yet migrated? 
                // Better to just attempt connect (idempotent if already connected? No, M-N unique constraint handles it?)
            ]
        }
    });

    console.log(`Found ${admins.length} admins to migrate.`);

    for (const admin of admins) {
        if (!admin.company_where_user_is_admin_id) continue;

        try {
            // Connect to new relation
            await prisma.user.update({
                where: { id: admin.id },
                data: {
                    companies_managed: {
                        connect: { id: admin.company_where_user_is_admin_id }
                    }
                }
            });
            process.stdout.write(`.`);
        } catch (e) {
            console.error(`\nFailed to migrate admin ${admin.email}:`, e);
        }
    }
    console.log("\nAdmins migrated.");

    // Migrate Customers
    const customers = await prisma.user.findMany({
        where: {
            company_where_user_is_customer_id: { not: null }
        }
    });

    console.log(`Found ${customers.length} customers to migrate.`);

    for (const customer of customers) {
        if (!customer.company_where_user_is_customer_id) continue;

        try {
            await prisma.user.update({
                where: { id: customer.id },
                data: {
                    companies_joined: {
                        connect: { id: customer.company_where_user_is_customer_id }
                    }
                }
            });
            process.stdout.write(`.`);
        } catch (e) {
            console.error(`\nFailed to migrate customer ${customer.email}:`, e);
        }
    }
    console.log("\nCustomers migrated.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
