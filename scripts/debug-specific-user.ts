
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load env from parent directory if needed, though usually standard config works
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const email = 'test@example.com';
    console.log(`--- Inspecting User: ${email} ---`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            companies_managed: true,
            companies_joined: true,
        }
    });

    if (!user) {
        console.log('❌ User not found!');
        return;
    }

    console.log('ID:', user.id);
    console.log('Role:', user.approval_level);
    console.log('Legacy Admin ID:', user.company_where_user_is_admin_id);
    console.log('Legacy Customer ID:', user.company_where_user_is_customer_id);
    console.log('--- Relations ---');
    console.log('Companies Managed:', user.companies_managed.length);
    user.companies_managed.forEach(c => console.log(` - [${c.id}] ${c.name}`));
    console.log('Companies Joined:', user.companies_joined.length);
    user.companies_joined.forEach(c => console.log(` - [${c.id}] ${c.name}`));

    if (user.companies_managed.length === 0 && user.companies_joined.length === 0) {
        console.log('\n⚠️ This user has NO relations.');
        if (user.company_where_user_is_admin_id || user.company_where_user_is_customer_id) {
            console.log('👉 But they HAVE legacy IDs! Migration should have worked.');
        } else {
            console.log('👉 And NO legacy IDs. This is an orphan user.');
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
