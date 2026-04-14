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

        const { delete_user_id, user_id, token } = body;

        const validateBody = bodySchema.safeParse(body);

        // Get env variables
        const config = useRuntimeConfig();
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateBody.success) {
            setResponseStatus(event, 401);
            return { data: {}, message: 'Input is in the wrong format', success: false }
        }

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

        // Get user to be deleted
        const userToDelete = await prisma.user.findUnique({
            where: { id: delete_user_id },
            select: {
                id: true,
                name: true,
                surname: true,
                email: true,
                approval_level: true,
                company_where_user_is_admin_id: true,
                company_where_user_is_customer_id: true
            }
        });

        if (!userToDelete) {
            setResponseStatus(event, 404);
            return { data: {}, message: 'User to delete not found', success: false };
        }

        // Security checks

        // 1. Cannot delete SUPER_ADMIN users (Unless Master Admin)
        if (userToDelete.approval_level === 'SUPER_ADMIN' && requestingUser.approval_level !== 'MASTER_ADMIN') {
            setResponseStatus(event, 403);
            return { data: {}, message: 'Cannot delete SUPER_ADMIN users', success: false };
        }

        // 2. Cannot delete yourself
        if (delete_user_id === user_id) {
            setResponseStatus(event, 403);
            return { data: {}, message: 'You cannot delete your own account', success: false };
        }

        // 3. Permission check
        if (requestingUser.approval_level === 'COMPANY_ADMIN') {
            // Company admin can only delete users in their company
            const canDelete =
                userToDelete.company_where_user_is_admin_id === requestingUser.company_where_user_is_admin_id ||
                userToDelete.company_where_user_is_customer_id === requestingUser.company_where_user_is_admin_id;

            if (!canDelete) {
                setResponseStatus(event, 403);
                return { data: {}, message: 'You can only delete users in your company', success: false };
            }
        } else if (requestingUser.approval_level !== 'SUPER_ADMIN') {
            // Only SUPER_ADMIN and COMPANY_ADMIN can delete users
            setResponseStatus(event, 403);
            return { data: {}, message: 'Permission denied', success: false };
        }

        // Soft delete - set deleted_at timestamp and status to false
        await prisma.user.update({
            where: { id: delete_user_id },
            data: {
                status: false,
                deleted_at: new Date()
            }
        });

        // Cascade to company if this was an admin
        const companyId = userToDelete.company_where_user_is_admin_id || userToDelete.company_where_user_is_customer_id;

        if (companyId && userToDelete.approval_level === 'COMPANY_ADMIN') {
            // Deleting a company admin - Logic stripped to prevent company disablement
            await createLog(
                'Delete',
                user_id,
                'User',
                `Deleted company admin ${userToDelete.name} ${userToDelete.surname}`
            );
        } else if (companyId && userToDelete.approval_level !== 'SUPER_ADMIN') {
            await createLog(
                'Delete',
                user_id,
                'User',
                `Deleted user ${userToDelete.name} ${userToDelete.surname} (${userToDelete.email}) (${userToDelete.id})`
            );
        } else {
            // Create log
            await createLog(
                'Delete',
                user_id,
                'User',
                `Deleted user ${userToDelete.name} ${userToDelete.surname} (${userToDelete.email}) (${userToDelete.id})`
            );
        }

        return {
            data: {},
            message: 'User successfully deleted',
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
