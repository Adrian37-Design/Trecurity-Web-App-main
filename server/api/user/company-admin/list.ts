import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // Validate input
        const bodySchema = z.object({ 
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        // Destruct body
        const { user_id, token } = body;

        const validateBody = bodySchema.safeParse(body);
        
        //Get env variables
        const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if(!validateBody.success) {
            setResponseStatus(event, 401)

            return { data: {}, message: 'Input is in the wrong format', success: false }
        }

        if(!validateToken.success) {
            setResponseStatus(event, 401)

            return { data: {}, message: 'Session is invalid', success: false }
        }

        // Get company ID from the User's data
        const user = await prisma.user.findUnique({
            where: {
                id: user_id
            }
        })

        const company_id = user.company_where_user_is_admin_id

        // Check if this user has access to this endpoint
        if(!await isAllowedOnEndpoint('COMPANY_ADMIN', company_id, user_id)) return { data: {}, message: 'User does not have permission', success: false }

        const users = await prisma.user.findMany({
            where: {
                status: true,
                OR: [
                    {
                        company_where_user_is_admin_id: company_id
                    },
                    {
                        company_where_user_is_customer_id: company_id
                    }
                ]
            },
            select: {
                id: true,
                name: true,
                surname: true,
                email: true
            }
        })

        return {
            data: users,
            message: "",
            success: true
        }
    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);

        return {
            data: [],
            message: "Server Error. Please try again later",
            success: false
        }
    }
});