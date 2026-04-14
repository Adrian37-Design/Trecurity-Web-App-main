import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
    try {
        const user_id = event.context.user?.id;
        if (!user_id) {
            setResponseStatus(event, 401);
            return { message: "Unauthorized", success: false };
        }

        // Only allow Super Admin
        const user = await prisma.user.findUnique({ where: { id: user_id } });
        if (user?.approval_level !== 'SUPER_ADMIN') {
            setResponseStatus(event, 403);
            return { message: "Forbidden - Super Admin only", success: false };
        }

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
            return { message: "Company not found", success: false };
        }

        // Find all company admins
        const companyAdmins = await prisma.user.findMany({
            where: {
                OR: [
                    { company_where_user_is_admin_id: company.id },
                    { company_where_user_is_customer_id: company.id }
                ],
                approval_level: 'COMPANY_ADMIN',
                status: true
            }
        });

        // Find Adrian
        const adrian = companyAdmins.find(u =>
            u.name?.toLowerCase().includes('adrian') ||
            u.email?.toLowerCase().includes('adrian')
        );

        if (!adrian) {
            return {
                message: "Could not find Adrian",
                admins: companyAdmins.map(u => `${u.name} ${u.surname} (${u.email})`),
                success: false
            };
        }

        // Get others to change
        const toChange = companyAdmins.filter(u => u.id !== adrian.id);

        if (toChange.length === 0) {
            return { message: "Adrian is already the only COMPANY_ADMIN", success: true };
        }

        // Update them to USER
        const result = await prisma.user.updateMany({
            where: {
                id: {
                    in: toChange.map(u => u.id)
                }
            },
            data: {
                approval_level: 'USER'
            }
        });

        return {
            message: `Updated ${result.count} users to USER role`,
            keptAsAdmin: `${adrian.name} ${adrian.surname} (${adrian.email})`,
            changedToUser: toChange.map(u => `${u.name} ${u.surname} (${u.email})`),
            success: true
        };

    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);
        return { message: `Error: ${(error as Error).message}`, success: false };
    }
});
