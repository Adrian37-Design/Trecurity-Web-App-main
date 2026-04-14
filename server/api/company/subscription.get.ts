import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user;
        if (!user || (user.approval_level !== 'COMPANY_ADMIN' && user.approval_level !== 'SUPER_ADMIN')) {
            setResponseStatus(event, 403);
            return { success: false, message: 'Forbidden' };
        }

        // If SUPER_ADMIN but no company assigned, block
        if (user.approval_level === 'SUPER_ADMIN' && !user.company_id) {
            setResponseStatus(event, 403);
            return { success: false, message: 'No company assigned to this admin' };
        }

        const company = await prisma.company.findUnique({
            where: { id: user.company_id },
            include: { subscription_plan: true }
        });

        if (!company) {
            return { success: false, message: 'Company not found' };
        }

        return {
            success: true,
            data: {
                status: company.subscription_status,
                expiry: company.subscription_expiry,
                plan: company.subscription_plan
            }
        };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
});
