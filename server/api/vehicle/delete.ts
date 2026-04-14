import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';
import { createLog } from "~/vendors/logs";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // Validate input
        const bodySchema = z.object({
            vehicle_id: z.string().cuid(),
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        const { vehicle_id, user_id, token } = body;

        const validateBody = bodySchema.safeParse(body);

        if (!validateBody.success) {
            setResponseStatus(event, 400);
            return { data: {}, message: 'Input is in the wrong format', success: false }
        }

        // Get env variables
        const config = useRuntimeConfig();
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateToken.success) {
            return { data: {}, message: 'Session is invalid (Token Check Failed)', success: false }
        }

        // Get requesting user
        const requestingUser = await prisma.user.findUnique({
            where: { id: user_id },
            select: {
                approval_level: true,
                company_where_user_is_admin_id: true
            }
        });

        if (!requestingUser) {
            setResponseStatus(event, 401);
            return { data: {}, message: 'User not found', success: false };
        }

        // Get vehicle to be deleted
        const vehicleToDelete = await prisma.vehicle.findUnique({
            where: { id: vehicle_id },
            include: {
                company: true
            }
        });

        if (!vehicleToDelete) {
            setResponseStatus(event, 404);
            return { data: {}, message: 'Vehicle not found', success: false };
        }

        // Permission check
        if (requestingUser.approval_level === 'COMPANY_ADMIN') {
            // Company admin can only delete vehicles in their company
            if (vehicleToDelete.company_id !== requestingUser.company_where_user_is_admin_id) {
                setResponseStatus(event, 403);
                return { data: {}, message: 'You can only delete vehicles in your company', success: false };
            }
        } else if (requestingUser.approval_level === 'SUPER_ADMIN') {
            // Check if this Super Admin is restricted to a company
            if (requestingUser.company_where_user_is_admin_id && vehicleToDelete.company_id !== requestingUser.company_where_user_is_admin_id) {
                setResponseStatus(event, 403);
                return { data: {}, message: 'You can only delete vehicles in your assigned company', success: false };
            }
        } else if (requestingUser.approval_level !== 'MASTER_ADMIN') {
            // Only MASTER_ADMIN, SUPER_ADMIN, and COMPANY_ADMIN can delete vehicles
            setResponseStatus(event, 403);
            return { data: {}, message: 'Permission denied', success: false };
        }

        // PERMANENT DELETE - Clean up related data first
        // 1. Delete tracking data
        await prisma.trackingData.deleteMany({
            where: { vehicle_id: vehicle_id }
        });

        // 2. Delete geofence settings/violations if needed
        await prisma.geofence.deleteMany({
            where: { vehicle_id: vehicle_id }
        });

        await prisma.violation.deleteMany({
            where: { vehicle_id: vehicle_id }
        });

        await prisma.controllerCommand.deleteMany({
            where: { vehicle_id: vehicle_id }
        });

        await prisma.sOSAlert.deleteMany({
            where: { vehicle_id: vehicle_id }
        });

        // 3. Finally, delete the vehicle
        await prisma.vehicle.delete({
            where: { id: vehicle_id }
        });

        // Create log
        await createLog(
            'Delete',
            user_id,
            'Vehicle',
            `Deleted vehicle ${vehicleToDelete.number_plate} (${vehicleToDelete.id}) from company ${vehicleToDelete.company.name}`
        );

        return {
            data: {},
            message: 'Vehicle successfully deleted',
            success: true
        };

    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);

        return {
            data: {},
            message: "Server Error. Please try again later",
            success: false
        }
    }
});
