import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    // --- STANDARD PLANS (Local) ---
    const intervals = [
        { id: 'monthly', name: 'Monthly', multiplier: 1 },
        { id: 'quarterly', name: 'Quarterly', multiplier: 3 },
        { id: 'biannual', name: 'Bi-Annually', multiplier: 6 },
        { id: 'annual', name: 'Annually', multiplier: 12 },
    ]

    const basePrice = 15; // Base monthly price
    const intlBasePrice = 25; // Base international price

    for (const i of intervals) {
        // Standard
        await prisma.subscriptionPlan.upsert({
            where: { id: `plan_standard_${i.id}` },
            update: {
                name: `Standard ${i.name}`,
                price: basePrice * i.multiplier,
            },
            create: {
                id: `plan_standard_${i.id}`,
                name: `Standard ${i.name}`,
                price: basePrice * i.multiplier, // No discount logic for now
                currency: 'USD',
                auto_recharge: true,
                interval: i.id.toUpperCase(),
                features: { roaming: false, local: true }
            }
        })

        // International
        await prisma.subscriptionPlan.upsert({
            where: { id: `plan_intl_${i.id}` },
            update: {
                name: `International ${i.name}`,
                price: intlBasePrice * i.multiplier,
            },
            create: {
                id: `plan_intl_${i.id}`,
                name: `International ${i.name}`,
                price: intlBasePrice * i.multiplier,
                currency: 'USD',
                auto_recharge: true,
                interval: i.id.toUpperCase(),
                features: { roaming: true, local: true }
            }
        })
    }

    // Keep Pay-As-You-Go
    await prisma.subscriptionPlan.upsert({
        where: { id: 'plan_basic' },
        update: {},
        create: {
            id: 'plan_basic',
            name: 'Pay-As-You-Go',
            price: 0,
            auto_recharge: false,
            interval: 'ONCE_OFF',
            features: {}
        }
    })

    console.log('All Plans seeded (Standard & International x 4 Intervals)')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
