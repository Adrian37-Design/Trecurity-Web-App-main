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
            number_plate: z.string().min(1, "Number plate is required"),
            type: z.string().min(1, "Vehicle type is required"),
            company: z.object({
                id: z.string()
            }).optional().refine(val => !!val, { message: "Company is required" }),
            users: z.array(z.any()).min(1, "At least one owner is required"),
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        const validateBody = bodySchema.safeParse(body);

        if (!validateBody.success) {
            console.error("SuperAdmin Vehicle Upsert Validation Error:", validateBody.error.format());
            setResponseStatus(event, 400);

            const errorMessages = validateBody.error.issues.map(err => err.message).join(", ");
            return { data: {}, message: errorMessages, success: false };
        }

        // Destruct body AFTER validation
        const { vehicle_id, number_plate, type, company, users, tracker_sim_phone, tracker_serial_number, status, user_id, token } = body;
        const normalizedPlate = number_plate?.toUpperCase().trim();

        //Get env variables
        const config = useRuntimeConfig();
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }
        
        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateToken.success) {
            setResponseStatus(event, 401)

            return { data: {}, message: 'Session is invalid', success: false }
        }

        // Check if this user has access to this endpoint
        if (!await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { data: {}, message: 'User does not have permission', success: false }

        // Create New Vehicle
        if (!vehicle_id) {
            // Check if number plate already exists
            const existingVehicle = await prisma.vehicle.findFirst({
                where: {
                    number_plate: normalizedPlate
                },
                include: {
                    company: true
                }
            })

            if (existingVehicle) return { data: {}, message: `A vehicle with this number plate already exists under account: ${existingVehicle.company.name}`, success: false }

            const vehicle = await prisma.vehicle.create({
                data: {
                    number_plate: normalizedPlate,
                    type,
                    company_id: company.id,
                    tracker_sim_phone: tracker_sim_phone || null,
                    tracker_serial_number: tracker_serial_number || null,
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

            if (vehicle.number_plate !== normalizedPlate) {
                // Check if number plate already exists
                const existingVehicle = await prisma.vehicle.findFirst({
                    where: {
                        number_plate: normalizedPlate,
                        id: { not: vehicle_id }
                    },
                    include: {
                        company: true
                    }
                })

                if (existingVehicle) return { data: {}, message: `A vehicle with this number plate already exists under account: ${existingVehicle.company.name}`, success: false }
            }

            // Atomic update: Set the users (replaces all existing connections)
            await prisma.vehicle.update({
                where: {
                    id: vehicle_id
                },
                data: {
                    number_plate: normalizedPlate,
                    type,
                    tracker_sim_phone: tracker_sim_phone || null,
                    tracker_serial_number: tracker_serial_number || null,
                    status,
                    company_id: company.id,
                    user: {
                        set: (users || []).map(({ id }) => ({ id }))
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
        console.error("SuperAdmin Vehicle Upsert Error:", error);
        console.error("SuperAdmin Vehicle Upsert Stack:", error.stack);
        setResponseStatus(event, 500);

        return {
            data: {},
            message: "Server Error: " + error.message,
            success: false
        }
    }
});
