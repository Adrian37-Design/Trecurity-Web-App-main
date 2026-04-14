
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const models = Object.keys(prisma).filter(key => key[0] !== '$' && key[0] !== '_');
    console.log('Prisma Models:', models);

    if (prisma.controllerCommand) {
        console.log('prisma.controllerCommand exists.');
    } else {
        console.log('prisma.controllerCommand DOES NOT exist.');
        // Find close match
        const match = models.find(m => m.toLowerCase().includes('command'));
        if (match) console.log(`Did you mean prisma.${match}?`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
