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
            number_plate: z.string(),
            type: z.string(),
            company: z.any(),
            users: z.any(),
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        // Destruct body
        const { vehicle_id, number_plate, type, company, users, tracker_sim_phone, status, user_id, token } = body;

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

        // Check if this user has access to this endpoint
        if (!await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { data: {}, message: 'User does not have permission', success: false }

        // Create New Vehicle
        if (!vehicle_id) {
            // Check if number plate already exists
            const vehicles = await prisma.vehicle.count({
                where: {
                    number_plate
                }
            })

            if (vehicles > 0) return { data: {}, message: "A vehicle with this number plate already exists", success: false }

            const vehicle = await prisma.vehicle.create({
                data: {
                    number_plate,
                    type,
                    company_id: company.id,
                    tracker_sim_phone: tracker_sim_phone || null,
                    user: {
                        connect: [
                            ...users.map(({ id }) => {
                                return {
                                    id
                                }
                            })
                        ]
                    }
                }
            })

            // Created log
            createLog('Create', user_id, 'Vehicle', `Created vehicle ${vehicle.number_plate} (${vehicle.id})`)

            return {
                data: vehicle,
                message: "",
                success: true
            }
        }
        // Update Vehicle
        else {
            const vehicle = await prisma.vehicle.findUnique({
                where: {
                    id: vehicle_id
                },
                include: {
                    user: true
                }
            })

            if (vehicle.number_plate !== number_plate) {
                // Check if number plate already exists
                const vehicles = await prisma.vehicle.count({
                    where: {
                        number_plate
                    }
                })

                if (vehicles > 0) return { data: {}, message: "A vehicle with this number plate already exists", success: false }
            }

            // Disconnect all user
            await prisma.vehicle.update({
                where: {
                    id: vehicle_id
                },
                data: {
                    user: {
                        disconnect: [
                            ...vehicle.user.map(({ id }) => {
                                return {
                                    id
                                }
                            })
                        ]
                    }
                }
            })

            // Connect the new users
            await prisma.vehicle.update({
                where: {
                    id: vehicle_id
                },
                data: {
                    number_plate,
                    type,
                    tracker_sim_phone: tracker_sim_phone || null,
                    status,
                    company_id: company.id,
                    user: {
                        connect: [
                            ...users.map(({ id }) => {
                                return {
                                    id
                                }
                            })
                        ]
                    }
                }
            })

            // Created log
            createLog('Update', user_id, 'Vehicle', `Update vehicle ${number_plate} (${vehicle.id})`)

            return {
                data: {},
                message: "",
                success: true
            }
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
