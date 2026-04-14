
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity',
    },
  },
});

async function main() {
    console.log("=== LIST OF ACCOUNTS ===\n");

    const users = await prisma.user.findMany({
        orderBy: { created_at: 'desc' },
        select: {
            id: true,
            name: true,
            email: true,
            approval_level: true,
            created_at: true,
            last_login: true
        }
    });

    console.table(users.map(u => ({
        Name: u.name,
        Email: u.email,
        Role: u.approval_level,
        Created: u.created_at ? u.created_at.toISOString().split('T')[0] : 'N/A',
        LastLogin: u.last_login ? u.last_login.toISOString().split('T')[0] : 'Never'
    })));

    console.log(`\nTotal Accounts: ${users.length}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
