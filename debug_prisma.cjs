const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity',
    },
  },
});

async function main() {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { number_plate: 'XCELAV1' }
    });
    console.log(JSON.stringify(vehicle, null, 2));
  } catch (err) {
    console.error('FULL PRISMA ERROR:');
    console.error(err);
    if (err.stack) console.error(err.stack);
  }
}

main().finally(() => prisma.$disconnect());
