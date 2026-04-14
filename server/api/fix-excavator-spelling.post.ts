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

        // Find vehicles with misspelled name
        const vehicles = await prisma.vehicle.findMany({
            where: {
                name: {
                    contains: 'ESCAVATOR'
                }
            },
            select: {
                id: true,
                name: true
            }
        });

        if (vehicles.length === 0) {
            return { message: "No vehicles found with 'ESCAVATOR' in the name", success: true };
        }

        // Update each vehicle individually
        let updated = 0;
        for (const vehicle of vehicles) {
            await prisma.vehicle.update({
                where: { id: vehicle.id },
                data: { name: vehicle.name.replace('ESCAVATOR', 'EXCAVATOR') }
            });
            updated++;
        }

        return {
            message: `Updated ${updated} vehicle(s) from ESCAVATOR to EXCAVATOR`,
            updatedCount: updated,
            vehicleNames: vehicles.map(v => v.name),
            success: true
        };

    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);
        return { message: `Error: ${(error as Error).message}`, success: false };
    }
});
