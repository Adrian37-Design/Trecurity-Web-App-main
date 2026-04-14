import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
    try {
        const user_id = event.context.user?.id;
        if (!user_id) {
            setResponseStatus(event, 401);
            return { message: "Unauthorized", success: false };
        }

        const user = await prisma.user.findUnique({ where: { id: user_id } });
        if (!user) {
            return { message: "User not found", success: false };
        }

        // Determine company
        let targetCompanyId: string | null = null;

        if (user.approval_level === 'SUPER_ADMIN') {
            const company = await prisma.company.findFirst({
                where: { name: { contains: 'NETRO', mode: 'insensitive' } }
            });
            if (!company) return { message: "NETRO MOTORS not found", success: false };
            targetCompanyId = company.id;
        } else if (user.approval_level === 'COMPANY_ADMIN') {
            targetCompanyId = user.company_where_user_is_admin_id;
            if (!targetCompanyId) return { message: "No company assigned", success: false };
        } else {
            setResponseStatus(event, 403);
            return { message: "Forbidden", success: false };
        }

        // List all users
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { company_where_user_is_admin_id: targetCompanyId },
                    { company_where_user_is_customer_id: targetCompanyId }
                ],
                status: true
            },
            select: {
                id: true,
                email: true,
                name: true,
                surname: true,
                approval_level: true,
                created_at: true
            },
            orderBy: { created_at: 'asc' }
        });

        return {
            message: "Users found",
            count: users.length,
            users: users.map(u => ({
                id: u.id,
                name: `${u.name} ${u.surname}`,
                email: u.email,
                role: u.approval_level,
                created: u.created_at
            })),
            success: true
        };

    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);
        return { message: `Error: ${(error as Error).message}`, success: false };
    }
});
