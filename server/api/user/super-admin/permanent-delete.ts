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
            delete_user_id: z.string().cuid(),
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        const { user_id, delete_user_id, token } = body;

        const validateBody = bodySchema.safeParse(body);

        //Get env variables
        const config = useRuntimeConfig();
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateBody.success) {
            setResponseStatus(event, 401)
            return { data: {}, message: 'Input is in the wrong format', success: false }
        }

        if (!validateToken.success) {
            return { data: {}, message: 'Session is invalid (Token Check Failed)', success: false }
        }

        // Check if this user has access to this endpoint
        if (!await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) {
            setResponseStatus(event, 403)
            return { data: {}, message: 'User does not have permission', success: false }
        }

        // Get users
        const requestingUser = await prisma.user.findUnique({ where: { id: user_id } });
        const userToDelete = await prisma.user.findUnique({ where: { id: delete_user_id } });

        if (!userToDelete) {
            setResponseStatus(event, 404);
            return { data: {}, message: 'User not found', success: false };
        }

        // Cannot delete yourself
        if (user_id === delete_user_id) {
            setResponseStatus(event, 403);
            return { data: {}, message: 'You cannot delete yourself', success: false };
        }

        // Cannot delete other SUPER_ADMIN users (Unless Master Admin)
        if (userToDelete.approval_level === 'SUPER_ADMIN' && requestingUser.approval_level !== 'MASTER_ADMIN') {
            setResponseStatus(event, 403);
            return { data: {}, message: 'Cannot delete SUPER_ADMIN users', success: false };
        }

        // PERMANENTLY DELETE - First clean up related data

        // 1. Unlink user from vehicles (many-to-many)
        await prisma.user.update({
            where: { id: delete_user_id },
            data: {
                vehicles: {
                    set: [] // Remove all vehicle associations
                }
            }
        });

        // 2. Delete user's logs
        await prisma.logs.deleteMany({
            where: { user_id: delete_user_id }
        });

        // 3. Delete user's login information
        await prisma.loginInformation.deleteMany({
            where: { user_id: delete_user_id }
        });

        // 4. Delete user's violations
        await prisma.violation.deleteMany({
            where: { user_id: delete_user_id }
        });

        // 5. Delete user's SOS alerts
        await prisma.sOSAlert.deleteMany({
            where: { user_id: delete_user_id }
        });

        // 6. Delete user's controller commands
        await prisma.controllerCommand.deleteMany({
            where: { user_id: delete_user_id }
        });

        // 7. Finally, delete the user
        await prisma.user.delete({
            where: { id: delete_user_id }
        });

        // Log the permanent deletion
        await createLog('Permanent Delete', user_id, 'User', `Permanently deleted user ${userToDelete.name} ${userToDelete.surname} (${userToDelete.email}) (${userToDelete.id})`);

        return {
            data: {},
            message: `User ${userToDelete.name} ${userToDelete.surname} has been permanently deleted`,
            success: true
        }
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
