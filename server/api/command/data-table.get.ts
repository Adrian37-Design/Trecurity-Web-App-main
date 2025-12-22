import { checkAppJwtToken } from "~/vendors/jwt";
import { isAllowedOnEndpoint } from "~/vendors/permission";
import { prisma } from "~~/prisma/db";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "../utils";

export default defineEventHandler(async (event) => {
    try {
        const model = 'controllerCommand';
        const params = getQuery(event);

        let number_plate: any = params["number_plate"];
        let user_id: any = params["user_id"];
        let token: any = params['token'];
        
        //Get env variables
        const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if(!validateToken.success) return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], message: 'Token is invalid' }

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
                { number_plate },
                { user: { some: { id: user_id } } }
            ]
        }}) && !await isAllowedOnEndpoint('COMPANY_ADMIN', company_id, user_id) && !await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { data: [], message: 'User does not have permission', success: false }

        // DataTable Parameters
        const { draw, start, search, length, orderColumnKey, orderDir } = getPaginationParams(event);

        const totalCount = prisma[model].count({
            where: {
                vehicle: {
                    number_plate
                }
            }
        });

        const totalPendingCommands = prisma[model].count({
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
    
        if(search) {
            const options = {
                where: {
                    AND: [
                        {
                            vehicle: {
                                number_plate
                            }
                        },
                        {
                            OR: [
                                {
                                    user: {
                                        name: {
                                            contains: search
                                        }
                                    }
                                },
                                {
                                    user: {
                                        surname: {
                                            contains: search
                                        }
                                    }
                                },
                                {
                                    user: {
                                        email: {
                                            contains: search
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
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
                orderBy: JSON.parse(`{
                    "${ orderColumnKey }": "${ orderDir.toLowerCase() }"
                }`)
            } satisfies Prisma.ControllerCommandFindManyArgs

            const recordsFiltered = prisma[model].findMany(Object.assign({}, options));

            // Add pagination
            //@ts-ignore
            options.skip = start;
            //@ts-ignore
            options.take = length;

            const paginateEntries = prisma[model].findMany(options);

            const [ total_count, total_pending_commands, records_filtered, paginate_data ] = await prisma.$transaction([ totalCount, totalPendingCommands, recordsFiltered, paginateEntries ]);
            
            return {
                draw,
                recordsTotal: total_count,
                pendingCommandsTotal: total_pending_commands,
                recordsFiltered: records_filtered.length,
                data: paginate_data
            }
        } else {
            const options = {
                where: {
                    vehicle: {
                        number_plate
                    }
                },
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
                orderBy: JSON.parse(`{
                    "${ orderColumnKey }": "${ orderDir.toLowerCase() }"
                }`)
            } satisfies Prisma.ControllerCommandFindManyArgs

            const recordsFiltered = prisma[model].findMany(Object.assign({}, options));

            // Add pagination
            //@ts-ignore
            options.skip = start;
            //@ts-ignore
            options.take = length;

            const paginateEntries = prisma[model].findMany(options);

            const [ total_count, total_pending_commands, records_filtered, paginate_data ] = await prisma.$transaction([ totalCount, totalPendingCommands, recordsFiltered, paginateEntries ]);
            
            return {
                draw,
                recordsTotal: total_count,
                pendingCommandsTotal: total_pending_commands,
                recordsFiltered: records_filtered.length,
                data: paginate_data
            }
        }
    }  catch (error) {
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