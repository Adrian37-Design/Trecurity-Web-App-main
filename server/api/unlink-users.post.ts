import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
    try {
        const user_id = event.context.user?.id;
        if (!user_id) {
            setResponseStatus(event, 401);
            return { message: "Unauthorized", success: false };
        }

        const user = await prisma.user.findUnique({ where: { id: user_id } });
        if (!user || (user.approval_level !== 'SUPER_ADMIN' && user.approval_level !== 'COMPANY_ADMIN')) {
            setResponseStatus(event, 403);
            return { message: "Forbidden", success: false };
        }

        // Get NETRO MOTORS company ID
        const company = await prisma.company.findFirst({
            where: {
                name: {
                    contains: 'NETRO'
                }
            }
        });

        if (!company) {
            return { message: "NETRO MOTORS not found", success: false };
        }

        // IDs of users to unlink from NETRO MOTORS
        const usersToUnlink = [
            'cmdae971j0001zkhloseuowmc', // Eugene Kudzai Jamu
            'cmdafzaho0003zkgsjrrg3oqa', // Victor Mudhabuyi
            'cmgaj7c6m01gazkole97w72h6'  // Xavier Mukodi
        ];

        // Set both company fields to NULL for these users
        const result = await prisma.user.updateMany({
            where: {
                id: {
                    in: usersToUnlink
                }
            },
            data: {
                company_where_user_is_admin_id: null,
                company_where_user_is_customer_id: null
            }
        });

        return {
            message: `Unlinked ${result.count} users from NETRO MOTORS`,
            unlinkedCount: result.count,
            success: true
        };

    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);
        return { message: `Error: ${(error as Error).message}`, success: false };
    }
});
