import { checkAppJwtToken } from "~/vendors/jwt";
import { isAllowedOnEndpoint } from "~/vendors/permission";
import { prisma } from "~~/prisma/db";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "../utils";

export default defineEventHandler(async (event) => {
    console.log("DEBUG_COMMAND_TABLE: Hit endpoint");
    try {
        // const model = 'controllerCommand'; // Using explicit access below instead
        const params = getQuery(event);

        let number_plate: any = params["number_plate"];
        let user_id: any = params["user_id"];
        let token: any = params['token'];

        //Get env variables
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";
        const config = useRuntimeConfig();
        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateToken.success) return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], message: 'Token is invalid' }

        // Get company ID from the User's data
        const user = await prisma.user.findUnique({
            where: {
                id: user_id
            }
        })

        const company_id = user.company_where_user_is_admin_id

        // Check if this user has access to this endpoint
        if (!await prisma.vehicle.count({
            where: {
                AND: [
                    { number_plate },
                    { user: { some: { id: user_id } } }
                ]
            }
        }) && !await isAllowedOnEndpoint('COMPANY_ADMIN', company_id, user_id) && !await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) {
            console.log("DEBUG_COMMAND_TABLE: Permission Denied for user", user_id, "on vehicle", number_plate);
            return {
                draw: isNaN(Number(params['draw'])) ? 1 : Number(params['draw']),
                recordsTotal: 0,
                recordsFiltered: 0,
                data: [],
                message: 'User does not have permission',
                success: false
            }
        }

        // DataTable Parameters
        const { draw, start, search, length, orderColumnKey, orderDir } = getPaginationParams(event);

        const totalCount = prisma.controllerCommand.count({
            where: {
                vehicle: {
                    number_plate
                }
            }
        });

        const totalPendingCommands = prisma.controllerCommand.count({
            where: {
                AND: [
                    {
                        vehicle: {
                            number_plate
                        }
                    },
                    {
                        is_executed: false
                    }
                ]
            }
        });

        if (search) {
            const whereClause = {
                AND: [
                    {
                        vehicle: {
                            number_plate
                        }
                    },
                    {
                        OR: [
                            { user: { name: { contains: search } } },
                            { user: { surname: { contains: search } } },
                            { user: { email: { contains: search } } }
                        ]
                    }
                ]
            };

            const options = {
                where: whereClause,
                include: {
                    user: {
                        select: {
                            name: true,
                            surname: true,
                            email: true,
                            approval_level: true
                        }
                    }
                },
                orderBy: {
                    [orderColumnKey]: orderDir.toLowerCase()
                },
                skip: start,
                take: length
            } satisfies Prisma.ControllerCommandFindManyArgs

            // OPTIMIZATION: Count first, then fetch page only
            const filteredCountPromise = prisma.controllerCommand.count({ where: whereClause });
            const paginateEntriesPromise = prisma.controllerCommand.findMany(options);

            const [total_count, total_pending_commands, records_filtered_count, paginate_data] = await prisma.$transaction([totalCount, totalPendingCommands, filteredCountPromise, paginateEntriesPromise]);

            console.log("DEBUG_COMMAND_TABLE (Search):", {
                number_plate,
                total_count,
                total_pending_commands,
                records_filtered_count,
                data_len: paginate_data?.length
            });

            return {
                draw,
                recordsTotal: total_count,
                pendingCommandsTotal: total_pending_commands,
                recordsFiltered: records_filtered_count,
                data: paginate_data
            }
        } else {
            const whereClause = {
                vehicle: {
                    number_plate
                }
            };

            const options = {
                where: whereClause,
                include: {
                    user: {
                        select: {
                            name: true,
                            surname: true,
                            email: true,
                            approval_level: true
                        }
                    }
                },
                orderBy: {
                    [orderColumnKey]: orderDir.toLowerCase()
                },
                skip: start,
                take: length
            } satisfies Prisma.ControllerCommandFindManyArgs

            // OPTIMIZATION: Count matches total if no search
            const paginateEntriesPromise = prisma.controllerCommand.findMany(options);

            const [total_count, total_pending_commands, paginate_data] = await prisma.$transaction([totalCount, totalPendingCommands, paginateEntriesPromise]);

            console.log("DEBUG_COMMAND_TABLE (No Search):", {
                number_plate,
                total_count,
                total_pending_commands,
                data_len: paginate_data?.length
            });

            return {
                draw,
                recordsTotal: total_count,
                pendingCommandsTotal: total_pending_commands,
                recordsFiltered: total_count, // Same as total since no search filter
                data: paginate_data
            }
        }
    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);

        return {
            draw: 1,
            recordsTotal: 0,
            recordsFiltered: 0,
            data: [],
            error: 'Server error. Please try again later'
        }
    }
});