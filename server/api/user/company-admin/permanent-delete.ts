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
        const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateBody.success) {
            setResponseStatus(event, 401)
            return { data: {}, message: 'Input is in the wrong format', success: false }
        }

        if (!validateToken.success) {
            setResponseStatus(event, 401)
            return { data: {}, message: 'Session is invalid', success: false }
        }

        // Get requesting user to check their company
        const requestingUser = await prisma.user.findUnique({ where: { id: user_id } });
        const company_id = requestingUser.company_where_user_is_admin_id;

        // Check if this user has access to this endpoint
        if (!await isAllowedOnEndpoint('COMPANY_ADMIN', company_id, user_id)) {
            setResponseStatus(event, 403)
            return { data: {}, message: 'User does not have permission', success: false }
        }

        // Get user to delete
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

        // Can only delete users in your company
        const userCompanyId = userToDelete.company_where_user_is_admin_id || userToDelete.company_where_user_is_customer_id;
        if (userCompanyId !== company_id) {
            setResponseStatus(event, 403);
            return { data: {}, message: 'You can only permanently delete users in your company', success: false };
        }

        // Cannot delete other company admins
        if (userToDelete.approval_level === 'COMPANY_ADMIN') {
            setResponseStatus(event, 403);
            return { data: {}, message: 'Company admins can only delete regular users, not other admins', success: false };
        }

        // PERMANENTLY DELETE - Remove from database
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
