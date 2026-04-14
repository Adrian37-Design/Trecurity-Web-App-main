import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
    try {
        if (!event.context.user) {
            setResponseStatus(event, 401);
            return { success: false, message: 'Unauthorized' };
        }

        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { price: 'asc' }
        });

        return { success: true, data: plans };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
});
