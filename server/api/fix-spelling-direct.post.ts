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

        // Use queryRaw instead of executeRaw to avoid restrictions
        const result = await prisma.$queryRaw`
            UPDATE "Vehicle" 
            SET "name" = 'EXCAVATOR' 
            WHERE "name" LIKE '%ESCAVATOR%'
            RETURNING id, name
        `;

        return {
            message: `Successfully updated ESCAVATOR to EXCAVATOR`,
            updatedVehicles: result,
            success: true
        };

    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);
        return { message: `Error: ${(error as Error).message}`, success: false };
    }
});
