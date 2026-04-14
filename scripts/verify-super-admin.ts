
import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Verifying Super Admins ---");
    const superAdmins = await prisma.user.findMany({
        where: { approval_level: 'SUPER_ADMIN' },
        include: {
            company_where_user_is_admin: true
        }
    });

    if (superAdmins.length === 0) {
        console.log("No SUPER_ADMIN users found.");
    }

    for (const user of superAdmins) {
        console.log(`User: ${user.email} (ID: ${user.id})`);
        console.log(`  - Company Admin For: ${user.company_where_user_is_admin_id}`);
        if (user.company_where_user_is_admin) {
            console.log(`  - Company Name: ${user.company_where_user_is_admin.name}`);
        } else {
            console.log(`  - [WARNING] Company relationship NOT found in DB join.`);
        }
    }

    console.log("\n--- Checking Inferth Projects ---");
    const company = await prisma.company.findFirst({
        where: { name: { contains: "Inferth", mode: "insensitive" } }
    });
    if (company) {
        console.log(`Found 'Inferth Projects': ${company.id} (Name: ${company.name})`);
    } else {
        console.log("Could NOT find 'Inferth Projects' company.");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
