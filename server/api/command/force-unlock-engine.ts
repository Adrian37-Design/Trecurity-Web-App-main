import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // Validate input
        const bodySchema = z.object({ 
            vehicle_id: z.string().cuid(),
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        // Destruct body
        const { vehicle_id, user_id, token } = body;

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
        if(!await prisma.vehicle.count({ where: {
            AND: [
                { id: vehicle_id },
                { user: { some: { id: user_id } } }
            ]
        }}) && !await isAllowedOnEndpoint('COMPANY_ADMIN', company_id, user_id) && !await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { data: {}, message: 'User does not have permission', success: false }

        // Get the latest geofence
        const geofence = await prisma.geofence.findFirst({
            where: {
                vehicle: {
                    some: {
                        id: vehicle_id
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        })
        
        // Set lock engine on geofence violation to false
        await prisma.vehicle.update({
            where: {
                id: vehicle_id
            },
            data: {
                lock_engine_on_geofence_violation: false,
                controller_command: {
                    create: [
                        {
                            code: "UPDATE_GEOFENCE",
                            payload: {
                                geofence,
                                lock_engine_on_geofence_violation: false
                            },
                            user: {
                                connect: {
                                    id: user_id
                                }
                            }
                        },
                        {
                            code: "ENGINE_UN_LOCK",
                            user: {
                                connect: {
                                    id: user_id
                                }
                            }
                        }
                    ]
                }
            }
        })

        return {
            data: {},
            message: "",
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
