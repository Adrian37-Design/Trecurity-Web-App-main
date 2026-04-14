const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Find NETRO MOTORS
        const company = await prisma.company.findFirst({
            where: {
                name: {
                    contains: 'NETRO',
                    mode: 'insensitive'
                }
            }
        });

        if (!company) {
            console.log("Company not found");
            return;
        }

        console.log(`\n=== Company: ${company.name} (${company.id}) ===\n`);

        // Count with the CURRENT dashboard logic (OR both fields)
        const companyAdminCount = await prisma.user.count({
            where: {
                AND: [
                    {
                        OR: [
                            { company_where_user_is_admin_id: company.id },
                            { company_where_user_is_customer_id: company.id }
                        ]
                    },
                    {
                        status: true
                    },
                    {
                        approval_level: 'COMPANY_ADMIN'
                    }
                ]
            }
        });

        const usersCount = await prisma.user.count({
            where: {
                AND: [
                    {
                        OR: [
                            { company_where_user_is_admin_id: company.id },
                            { company_where_user_is_customer_id: company.id }
                        ]
                    },
                    {
                        status: true
                    },
                    {
                        approval_level: {
                            not: 'COMPANY_ADMIN'
                        }
                    }
                ]
            }
        });

        console.log(`Dashboard Query Results:`);
        console.log(`  Company Admins: ${companyAdminCount}`);
        console.log(`  Users: ${usersCount}`);

        // List ALL users for this company
        const allUsers = await prisma.user.findMany({
            where: {
                OR: [
                    { company_where_user_is_admin_id: company.id },
                    { company_where_user_is_customer_id: company.id }
                ],
                status: true
            },
            select: {
                id: true,
                email: true,
                approval_level: true,
                company_where_user_is_admin_id: true,
                company_where_user_is_customer_id: true
            }
        });

        console.log(`\nAll ${allUsers.length} users linked to this company:`);
        allUsers.forEach(u => {
            console.log(`  - ${u.email} | Level: ${u.approval_level} | AdminID: ${u.company_where_user_is_admin_id} | CustomerID: ${u.company_where_user_is_customer_id}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
