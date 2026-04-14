
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
    const email = 'test@example.com';
    console.log(`--- Linking ${email} to Suburban Security ---`);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { console.log('❌ User not found'); return; }

    const company = await prisma.company.findFirst({
        where: { name: { contains: 'Suburban', mode: 'insensitive' } }
    });

    if (!company) { console.log('❌ Company "Suburban Security" not found'); return; }

    console.log(`Found Company: ${company.name} (${company.id})`);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            companies_managed: {
                connect: { id: company.id }
            }
        }
    });

    console.log('✅ Linked successfully!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
