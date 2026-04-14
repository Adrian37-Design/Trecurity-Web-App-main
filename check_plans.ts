import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const plans = await prisma.subscriptionPlan.findMany()
    console.log('Plans found:', plans)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
