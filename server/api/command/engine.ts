import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // Validate input - make user_id and token optional as middleware handles auth usually
        const bodySchema = z.object({
            vehicle_id: z.string().cuid(),
            code: z.enum(['ENGINE_LOCK', 'ENGINE_UN_LOCK']),
            user_id: z.string().cuid().optional(),
            token: z.string().regex(jwt_regex).optional()
        });

        const validateBody = bodySchema.safeParse(body);

        if (!validateBody.success) {
            setResponseStatus(event, 401)
            return { data: {}, message: 'Input is in the wrong format', success: false }
        }

        // Destruct body
        const { vehicle_id, code, user_id, token } = body;

        let authenticated_user_id = event.context.user?.id;

        // Fallback: If middleware didn't authenticate (e.g. no cookie), try body token
        if (!authenticated_user_id && token && user_id) {
            //Get env variables
            const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
            const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

            if (validateToken.success) {
                authenticated_user_id = user_id;
            }
        }

        if (!authenticated_user_id) {
            setResponseStatus(event, 401)
            return { data: {}, message: 'Session is invalid or expired', success: false }
        }

        // Get company ID from the User's data
        const user = await prisma.user.findUnique({
            where: {
                id: authenticated_user_id
            }
        })

        if (!user) {
            setResponseStatus(event, 401)
            return { data: {}, message: 'User not found', success: false }
        }

        const company_id = user.company_where_user_is_admin_id

        // Check if this user has access to this endpoint
        if (!await prisma.vehicle.count({
            where: {
                AND: [
                    { id: vehicle_id },
                    { user: { some: { id: authenticated_user_id } } }
                ]
            }
        }) && !await isAllowedOnEndpoint('COMPANY_ADMIN', company_id, authenticated_user_id) && !await isAllowedOnEndpoint('SUPER_ADMIN', null, authenticated_user_id)) return { data: {}, message: 'User does not have permission', success: false }

        // Add the engine command with override logic
        await prisma.$transaction(async (tx) => {
            // Delete any pending (not executed) engine commands for this vehicle
            // This allows users to override/change their command
            await tx.controllerCommand.deleteMany({
                where: {
                    vehicle_id,
                    is_executed: false,
                    code: {
                        in: ['ENGINE_LOCK', 'ENGINE_UN_LOCK']
                    }
                }
            });

            // Create the new command
            await tx.controllerCommand.create({
                data: {
                    code,
                    vehicle: {
                        connect: {
                            id: vehicle_id
                        }
                    },
                    user: {
                        connect: {
                            id: authenticated_user_id
                        }
                    }
                }
            });
        }, {
            maxWait: 10000,  // Wait up to 10s to start transaction
            timeout: 30000,  // Transaction timeout 30s
        });

        return {
            data: {},
            message: "Command sent successfully",
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
