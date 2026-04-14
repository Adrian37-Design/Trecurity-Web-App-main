import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
    try {
        const user_id = event.context.user?.id;
        if (!user_id) {
            setResponseStatus(event, 401);
            return { message: "Unauthorized", success: false };
        }

        // Get user details
        const user = await prisma.user.findUnique({ where: { id: user_id } });
        if (!user) {
            setResponseStatus(event, 404);
            return { message: "User not found", success: false };
        }

        // Determine which company to fix based on user role
        let targetCompanyId: string | null = null;

        if (user.approval_level === 'SUPER_ADMIN') {
            // Super admin can fix any company - find NETRO MOTORS
            const company = await prisma.company.findFirst({
                where: {
                    name: {
                        contains: 'NETRO',
                        mode: 'insensitive'
                    }
                }
            });
            if (!company) {
                return { message: "NETRO MOTORS not found", success: false };
            }
            targetCompanyId = company.id;
        } else if (user.approval_level === 'COMPANY_ADMIN') {
            // Company admin can only fix their own company
            targetCompanyId = user.company_where_user_is_admin_id;
            if (!targetCompanyId) {
                return { message: "You are not admin of any company", success: false };
            }
        } else {
            setResponseStatus(event, 403);
            return { message: "Forbidden - Admin access required", success: false };
        }

        // Ensure targetCompanyId is set before proceeding
        if (!targetCompanyId) {
            setResponseStatus(event, 500); // Should not happen if logic above is correct
            return { message: "Internal server error: Target company not determined", success: false };
        }

        // Find all company admins
        const companyAdmins = await prisma.user.findMany({
            where: {
                OR: [
                    { company_where_user_is_admin_id: targetCompanyId },
                    { company_where_user_is_customer_id: targetCompanyId }
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
