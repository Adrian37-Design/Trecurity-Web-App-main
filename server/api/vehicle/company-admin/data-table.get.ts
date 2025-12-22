import { checkAppJwtToken } from "~/vendors/jwt";
import { isAllowedOnEndpoint } from "~/vendors/permission";
import { prisma } from "~~/prisma/db";
import { Prisma } from "@prisma/client";

export default defineEventHandler(async (event) => {
    try {
        const model = 'vehicle';
        const params = getQuery(event);

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
        if(!await isAllowedOnEndpoint('COMPANY_ADMIN', company_id, user_id)) return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], error: 'User does not have permission' } 

        //DataTable Parameters
        let draw: number = Number(params['draw']);
        let start: number = Number(params['start']); 
        let length: number = Number(params['length']); 
        let search: any = params['search[value]']; 
        let orderColumnNumber: number = Number(params['order[0][column]']);
        let orderColumnKey: any = params[`columns[${ orderColumnNumber }][data]`] ?? 'created_at';
        let orderDir: any = params['order[0][dir]'] ?? 'asc'; // asc 

        const totalCount = prisma[model].count({
            where: {
                company_id
            }
        });

        if(search){
            const options = {
                where: {
                    company_id,
                    OR: [
                        {
                            id: {
                                contains: search
                            }
                        },
                        {
                            number_plate: {
                                contains: search
                            }
                        },
                        {
                            type: {
                                contains: search
                            }
                        },
                        {
                            user: {
                                some: {
                                    name: {
                                        contains: search
                                    }
                                }
                            }
                        },
                        {
                            user: {
                                some: {
                                    surname: {
                                        contains: search
                                    }
                                }
                            }
                        },
                        {
                            user: {
                                some: {
                                    email: {
                                        contains: search
                                    }
                                }
                            }
                        },
                        {
                            user: {
                                some: {
                                    phone: {
                                        contains: search
                                    }
                                }
                            }
                        }
                    ]
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            surname: true,
                            email: true
                        }
                    },
                    tracking_data: {
                        orderBy: {
                            created_at: 'desc'
                        },
                        take: 1
                    }
                },
                orderBy: JSON.parse(`{
                    "${ orderColumnKey }": "${ orderDir.toLowerCase() }"
                }`)
            } satisfies Prisma.VehicleFindManyArgs

            const recordsFiltered = prisma[model].findMany(Object.assign({}, options));

            // Add pagination
            //@ts-ignore
            options.skip = start;
            //@ts-ignore
            options.take = length;

            const searchEntry = prisma[model].findMany(options);

            const [ total_count, records_filtered, search_entry ] = await prisma.$transaction([ totalCount, recordsFiltered, searchEntry ]);

            return {
                draw,
                recordsTotal: total_count,
                recordsFiltered: records_filtered.length,
                data: search_entry
            }
        }else {      
            const options = {
                where: {
                    company_id
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            surname: true,
                            email: true
                        }
                    },
                    tracking_data: {
                        orderBy: {
                            created_at: 'desc'
                        },
                        take: 1
                    }
                },
                orderBy: JSON.parse(`{
                    "${ orderColumnKey }": "${ orderDir.toLowerCase() }"
                }`)
            } satisfies Prisma.VehicleFindManyArgs

            const recordsFiltered = prisma[model].findMany(Object.assign({}, options));

            // Add pagination
            //@ts-ignore
            options.skip = start;
            //@ts-ignore
            options.take = length;

            const paginateEntries = prisma[model].findMany(options);

            const [ total_count, records_filtered, paginate_data ] = await prisma.$transaction([ totalCount, recordsFiltered, paginateEntries ]);
            
            return {
                draw,
                recordsTotal: total_count,
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