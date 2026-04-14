import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';
import { ApprovalLevel } from "@prisma/client";

export default defineEventHandler(async (event) => {
    try {
        // Get query parameters
        const query = getQuery(event);

        // Validate input - make user_id and token optional as middleware handles auth usually
        const querySchema = z.object({
            command_id: z.string().cuid(),
            user_id: z.string().cuid().optional(),
            token: z.string().regex(jwt_regex).optional()
        });

        const validateQuery = querySchema.safeParse(query);

        if (!validateQuery.success) {
            setResponseStatus(event, 400);
            return { data: {}, message: 'Invalid request parameters', success: false }
        }

        const { command_id, user_id, token } = query as { command_id: string, user_id: string, token: string };

        let authenticated_user_id = event.context.user?.id;

        // Fallback: If middleware didn't authenticate (e.g. no cookie), try query token
        if (!authenticated_user_id && token && user_id) {
            // Validate JWT token
            const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
            const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

            if (validateToken.success) {
                authenticated_user_id = user_id;
            }
        }

        if (!authenticated_user_id) {
            setResponseStatus(event, 401);
            return { data: {}, message: 'Session is invalid or expired', success: false }
        }

        // Get the command
        const command = await prisma.controllerCommand.findUnique({
            where: { id: command_id },
            include: { vehicle: true }
        });

        if (!command) {
            setResponseStatus(event, 404);
            return { data: {}, message: 'Command not found', success: false }
        }

        // Check if already executed
        if (command.is_executed) {
            setResponseStatus(event, 400);
            return { data: {}, message: 'Cannot cancel - command already executed by vehicle', success: false }
        }

        // Get user's company
        const user = await prisma.user.findUnique({
            where: { id: authenticated_user_id }
        });

        const company_id = user.company_where_user_is_admin_id;

        // Check permissions
        const hasPermission =
            await prisma.vehicle.count({
                where: {
                    AND: [
                        { id: command.vehicle_id },
                        { user: { some: { id: authenticated_user_id } } }
                    ]
                }
            }) > 0 ||
            await isAllowedOnEndpoint(ApprovalLevel.COMPANY_ADMIN, company_id, authenticated_user_id) ||
            await isAllowedOnEndpoint(ApprovalLevel.SUPER_ADMIN, null, authenticated_user_id);

        if (!hasPermission) {
            setResponseStatus(event, 403);
            return { data: {}, message: 'Permission denied', success: false }
        }

        // Delete the command
        await prisma.controllerCommand.delete({
            where: { id: command_id }
        });

        return {
            data: {},
            message: `${command.code} command cancelled successfully`,
            success: true
        }

    } catch (error) {
        console.error('Cancel Command Error:', error);
        setResponseStatus(event, 500);

        return {
            data: {},
            message: error.message || "Server Error. Please try again later",
            success: false
        }
    }
});
