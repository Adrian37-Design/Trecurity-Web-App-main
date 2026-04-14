// Check for MASTER_ADMIN users in database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

async function findMasterAdmins() {
    try {
        const masterAdmins = await prisma.user.findMany({
            where: {
                approval_level: 'MASTER_ADMIN'
            },
            select: {
                id: true,
                email: true,
                name: true,
                surname: true,
                approval_level: true,
                status: true,
                created_at: true
            }
        });

        console.log('\n=== MASTER_ADMIN Users ===');
        console.log('Found:', masterAdmins.length);

        if (masterAdmins.length === 0) {
            console.log('\n❌ No MASTER_ADMIN users found!');
            console.log('\nYou need to either:');
            console.log('1. Create a new MASTER_ADMIN user, or');
            console.log('2. Update an existing SUPER_ADMIN to MASTER_ADMIN');
        } else {
            console.log('\n✅ MASTER_ADMIN users:');
            masterAdmins.forEach(admin => {
                console.log(`\nEmail: ${admin.email}`);
                console.log(`Name: ${admin.name} ${admin.surname}`);
                console.log(`Status: ${admin.status ? 'ENABLED' : 'DISABLED'}`);
                console.log(`ID: ${admin.id}`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

findMasterAdmins();
