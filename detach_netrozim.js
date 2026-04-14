
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'netrozim@gmail.com';
    console.log(`Detaching user: ${email} from all companies...`);

    const user = await prisma.user.findFirst({
        where: { email: email.trim() }
    })

    if (!user) {
        console.log('ERROR: User not found!');
        return;
    }

    // Set both admin and customer company IDs to null to ensure they are fully "global"
    const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
            company_where_user_is_admin_id: null,
            company_where_user_is_customer_id: null
        }
    });

    console.log(`SUCCESS: User ${updated.email} is now fully detached.`);
    console.log(`Admin Company ID: ${updated.company_where_user_is_admin_id}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect())
