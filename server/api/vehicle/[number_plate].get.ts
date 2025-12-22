import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';

export default defineEventHandler(async (event) => {
    try {
        
        // auth
        const user_id = event.context.user?.id;
        if (!user_id) {
            setResponseStatus(event, 401);
            return;
        }



        // Destruct body
        const { number_plate } = getRouterParams(event);

        // Get company ID from the User's data
        const user = await prisma.user.findUnique({
            where: {
                id: user_id
            }
        })

        const company_id = user?.company_where_user_is_admin_id

        // Check if this user has access to this endpoint
        if (!await prisma.vehicle.count({ where: {
            AND: [
                { number_plate },
                { user: { some: { id: user_id } } }
            ]
        }}) && !await isAllowedOnEndpoint('COMPANY_ADMIN', company_id, user_id) && !await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { data: {}, message: 'User does not have permission', success: false }

        const vehicle = await prisma.vehicle.findUnique({
            where: {
                number_plate
            },
            include: {
                user: {
                    where: {
                        status: true
                    },
                    select: {
                        name: true,
                        surname: true,
                        email: true
                    }
                },
                company: {
                    select: {
                        name: true
                    }
                },
                tracking_data: {
                    take: 1,
                    orderBy: {
                        created_at: 'desc'
                    }
                },
                controller_command: {
                    take: 1,
                    orderBy: {
                        created_at: 'desc'
                    }
                },
                _count: {
                    select: {
                        controller_command: {
                            where: {
                                is_executed: false
                            }
                        }
                    }
                },
                route: true,
                geofence: true,
            }
        });

        return {
            data: vehicle,
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
