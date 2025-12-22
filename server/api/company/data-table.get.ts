import { checkAppJwtToken } from "~/vendors/jwt";
import { isAllowedOnEndpoint } from "~/vendors/permission";
import { prisma } from "~~/prisma/db";

export default defineEventHandler(async (event) => {
    try {
        const model = 'company';
        const params = getQuery(event);

        let id: any = params["id"];
        let user_id: any = params["user_id"];
        let token: any = params['token'];
        
        //Get env variables
        const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if(!validateToken.success) return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], message: 'Token is invalid' }

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
            const options: any = {
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
                            email: {
                                contains: search
                            }
                        },
                        {
                            website: {
                                contains: search
                            }
                        },
                        {
                            physical_address: {
                                contains: search
                            }
                        }
                    ]
                },
                include: {
                    _count: {
                        select: {
                            admins: true,
                            customers: true,
                            vehicles: true
                        }
                    }
                }
            };

            //Add order by
            //@ts-ignore
            options.orderBy = {};
            
            options.orderBy[orderColumnKey] = orderDir.toLowerCase();

            const recordsFiltered = prisma[model].findMany(Object.assign({}, options));

            // Add pagination
            options.skip = start;
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
            const options: any = {
                include: {
                    _count: {
                        select: {
                            admins: true,
                            customers: true,
                            vehicles: true
                        }
                    }
                }
            };

            //Add order by
            //@ts-ignore
            options.orderBy = {};
            
            options.orderBy[orderColumnKey] = orderDir.toLowerCase();

            const recordsFiltered = prisma[model].findMany(Object.assign({}, options));

            // Add pagination
            options.skip = start;
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