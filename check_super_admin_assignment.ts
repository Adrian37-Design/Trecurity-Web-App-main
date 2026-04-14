
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const superAdmins = await prisma.user.findMany({
        where: { approval_level: 'SUPER_ADMIN' },
        include: {
            companies_managed: true,
            company_where_user_is_admin: true
        }
    })

    console.log('--- SUPER ADMIN ASSIGNMENTS ---')
    superAdmins.forEach(u => {
        console.log(`User: ${u.email} (${u.name} ${u.surname})`)
        console.log(`  legacy_admin_id: ${u.company_where_user_is_admin_id}`)
        console.log(`  companies_managed: ${u.companies_managed.map(c => c.name).join(', ')}`)
        console.log(`  company_where_user_is_admin: ${u.company_where_user_is_admin?.name}`)
        console.log('-------------------------------')
    })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
