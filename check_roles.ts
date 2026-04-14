
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { approval_level: 'SUPER_ADMIN' },
                { approval_level: 'MASTER_ADMIN' }
            ]
        },
        select: {
            email: true,
            approval_level: true,
            company_where_user_is_admin_id: true,
            companies_managed: { select: { name: true } }
        }
    })

    console.log('--- USER ROLES (Super/Master) ---')
    console.table(users)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
