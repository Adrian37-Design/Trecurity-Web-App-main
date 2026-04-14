
import { createAppJwtToken, checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const { target_company_id, user_id, approval_level, token } = body;

        //Get env variables
        const config = useRuntimeConfig();
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateToken.success) {
            setResponseStatus(event, 401);
            return { message: 'Session is invalid', success: false };
        }

        // Verify User Permissions for Target Company
        const user = await prisma.user.findUnique({
            where: { id: user_id },
            include: {
                companies_managed: true,
                companies_joined: true
            }
        });

        if (!user) {
            setResponseStatus(event, 404);
            return { message: 'User not found', success: false };
        }

        // Check if user belongs to target company
        let isAuthorized = false;

        if (approval_level === 'SUPER_ADMIN') {
            isAuthorized = true;
        } else if (approval_level === 'COMPANY_ADMIN') {
            // Super Admin can switch? If they are admin of that company?
            // "Multi-Company User" usually implies they might be Admin in A and User in B?
            // Currently role is fixed on User.
            // If they are COMPANY_ADMIN, check companies_managed.
            if (user.companies_managed.some(c => c.id === target_company_id)) {
                isAuthorized = true;
            }
        } else if (approval_level === 'USER') {
            if (user.companies_joined.some(c => c.id === target_company_id)) {
                isAuthorized = true;
            }
        }

        // Check legacy fields just in case (if not already authorized)
        if (!isAuthorized) {
            if (user.company_where_user_is_admin_id === target_company_id || user.company_where_user_is_customer_id === target_company_id) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            setResponseStatus(event, 403);
            return { message: 'You are not authorized for this company', success: false };
        }

        // Generate New Token
        const newToken = await createAppJwtToken(JWT_APP_TOKEN_SECRET, user.id, approval_level, target_company_id);
        setCookie(event, "token", newToken);

        return {
            message: "Switched company successfully",
            token: newToken,
            active_company_id: target_company_id,
            success: true
        };

    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);
        return { message: "Server Error", success: false };
    }
});
