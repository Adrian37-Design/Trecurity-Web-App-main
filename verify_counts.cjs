

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.count();
        const companies = await prisma.company.count();
        const vehicles = await prisma.vehicle.count();
        console.log(JSON.stringify({ users, companies, vehicles }, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
