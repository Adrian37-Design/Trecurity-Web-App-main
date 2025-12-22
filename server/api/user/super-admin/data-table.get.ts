import { checkAppJwtToken } from "~/vendors/jwt";
import { isAllowedOnEndpoint } from "~/vendors/permission";
import { prisma } from "~~/prisma/db";
import { Prisma } from "@prisma/client";

export default defineEventHandler(async (event) => {

    try {
        const model = 'user';
        const params = getQuery(event);

        
        // auth
        if(!event.context.user) {
            // TODO: This check could have been in a directory middleware
            setResponseStatus(event, 401);
            return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], message: 'Token is invalid' }
        }

        const user_id: string = event.context.user.id;

        // Check if this user has access to this endpoint
        if(!await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], error: 'User does not have permission' } 

        //DataTable Parameters
        let draw: number = Number(params['draw']);
        let start: number = Number(params['start']); 
        let length: number = Number(params['length']); 
        let search: any = params['search[value]']; 
        let orderColumnNumber: number = Number(params['order[0][column]']);
        let orderColumnKey: any = params[`columns[${ orderColumnNumber }][data]`] ?? 'created_at';
        let orderDir: any = params['order[0][dir]'] ?? 'asc'; // asc 

        const totalCount = prisma[model].count();

        if(search){
            const options = {
                where: {
                    OR: [
                        {
                            id: {
                                contains: search
                            }
                        },
                        {
                            name: {
                                contains: search
                            }
                        },
                        {
                            surname: {
                                contains: search
                            }
                        },
                        {
                            email: {
                                contains: search
                            }
                        },
                        {
                            phone: {
                                contains: search
                            }
                        },
                        {
                            vehicles: {
                                some: {
                                    number_plate: {
                                        contains: search
                                    }
                                }
                            }
                        },
                        {
                            company_where_user_is_admin: {
                                name: {
                                    contains: search
                                }
                            }
                        },
                        {
                            company_where_user_is_customer: {
                                name: {
                                    contains: search
                                }
                            }
                        }
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    surname: true,
                    email: true,
                    phone: true,
                    approval_level: true,
                    status: true,
                    is_locked: true,
                    company_where_user_is_admin: true,
                    company_where_user_is_customer: true,
                    created_at: true,
                    _count: {
                        select: {
                            vehicles: true
                        }
                    }
                },
                orderBy: JSON.parse(`{
                    "${ orderColumnKey }": "${ orderDir.toLowerCase() }"
                }`)
            } satisfies Prisma.UserFindManyArgs

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
                select: {
                    id: true,
                    name: true,
                    surname: true,
                    email: true,
                    phone: true,
                    approval_level: true,
                    status: true,
                    is_locked: true,
                    company_where_user_is_admin: true,
                    company_where_user_is_customer: true,
                    created_at: true,
                    _count: {
                        select: {
                            vehicles: true
                        }
                    }
                },
                orderBy: JSON.parse(`{
                    "${ orderColumnKey }": "${ orderDir.toLowerCase() }"
                }`)
            } satisfies Prisma.UserFindManyArgs

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