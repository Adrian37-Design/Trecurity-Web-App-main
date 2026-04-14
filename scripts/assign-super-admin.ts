
import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const companyName = "Inferth Projects";

    console.log(`Searching for company: ${companyName}...`);
    const company = await prisma.company.findFirst({
        where: {
            name: {
                contains: companyName,
                mode: 'insensitive'
            }
        }
    });

    if (!company) {
        console.error(`Company '${companyName}' not found!`);
        return;
    }

    console.log(`Found company: ${company.name} (${company.id})`);

    // Find Super Admin(s)
    const superAdmins = await prisma.user.findMany({
        where: {
            approval_level: 'SUPER_ADMIN'
        }
    });

    if (superAdmins.length === 0) {
        console.log("No users with SUPER_ADMIN role found.");
        return;
    }

    console.log(`Found ${superAdmins.length} Super Admin(s). Assigning them to ${company.name}...`);

    for (const admin of superAdmins) {
        if (admin.company_where_user_is_admin_id === company.id) {
            console.log(`User ${admin.email} is already assigned correctly.`);
            continue;
        }

        await prisma.user.update({
            where: { id: admin.id },
            data: {
                company_where_user_is_admin_id: company.id
            }
        });
        console.log(`UPDATED: Assigned ${admin.email} (ID: ${admin.id}) to company ${company.id}`);
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
