const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity',
    },
  },
});

async function main() {
  const vehicle = await prisma.vehicle.findUnique({
    where: { number_plate: 'XCELAV1' },
    select: { id: true, number_plate: true }
  });

  if (!vehicle) {
    console.log('Vehicle XCELAV1 not found');
    return;
  }

  console.log(`Checking data for ${vehicle.number_plate} (ID: ${vehicle.id})`);

  // Get recent tracking data
  const data = await prisma.trackingData.findMany({
    where: { vehicle_id: vehicle.id },
    orderBy: { time_from: 'desc' },
    take: 50
  });

  console.log(`Found ${data.length} recent tracking points`);
  data.forEach((p, i) => {
    console.log(`[${i}] Time: ${p.time_from.toISOString()} | Ignition: ${p.ignition} | State: ${p.state} | Speed: ${p.speed}`);
  });

  // Check gaps manually
  if (data.length > 1) {
      for (let i = 0; i < data.length - 1; i++) {
          const diffMin = (data[i].time_from - data[i+1].time_from) / (1000 * 60);
          if (diffMin > 30) {
              console.log(`GAP at [${i}]: ${diffMin.toFixed(2)} minutes`);
          }
      }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
