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
        const config = useRuntimeConfig();
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateToken.success) return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], message: 'Token is invalid' }

        //DataTable Parameters
        let draw: number = Number(params['draw']);
        let start: number = Number(params['start']);
        let length: number = Number(params['length']);
        let search: any = params['search[value]'];
        let orderColumnNumber: number = Number(params['order[0][column]']);
        let orderColumnKey: any = params[`columns[${orderColumnNumber}][data]`] ?? 'created_at';
        let orderDir: any = params['order[0][dir]'] ?? 'asc'; // asc 

        const totalCount = prisma[model].count();



        // Check if this user has access to this endpoint
        // MASTER_ADMIN passes this because we updated isAllowedOnEndpoint
        if (!await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], error: 'User does not have permission' }

        // Get Current User to determine scope
        const currentUser = await prisma.user.findUnique({ where: { id: user_id } });
        const isMaster = currentUser?.approval_level === 'MASTER_ADMIN';
        const isSuper = currentUser?.approval_level === 'SUPER_ADMIN';

        let whereCondition: any = {};

        // If Super Admin, strict filter to own created companies AND their own company
        if (isSuper && currentUser?.company_where_user_is_admin_id) {
            whereCondition.OR = [
                { id: currentUser.company_where_user_is_admin_id },
                { parent_company_id: currentUser.company_where_user_is_admin_id }
            ];
        }
        // If Master Admin, no extra filter (sees all)

        console.log(`[COMPANY_LIST_DEBUG] User: ${currentUser?.email} (${currentUser?.approval_level})`);
        console.log(`[COMPANY_LIST_DEBUG] isSuper: ${isSuper}, isMaster: ${isMaster}`);
        console.log(`[COMPANY_LIST_DEBUG] WhereCondition: ${JSON.stringify(whereCondition)}`);

        if (search) {
            // ... (existing search logic)
            const options: any = {
                where: {
                    AND: [
                        whereCondition, // Apply Scope Filter
                        {
                            OR: [
                                { id: { contains: search } },
                                { name: { contains: search } },
                                { email: { contains: search } },
                                { website: { contains: search } },
                                { physical_address: { contains: search } }
                            ]
                        }
                    ]
                },
                // ...
            };
            // ...
            //Add order by
            //@ts-ignore
            options.orderBy = {};

            options.orderBy[orderColumnKey] = orderDir.toLowerCase();

            const recordsFiltered = prisma[model].findMany(Object.assign({}, options));

            // Add pagination
            options.skip = start;
            options.take = length;

            const searchEntry = prisma[model].findMany(options);

            const [total_count, records_filtered, search_entry] = await prisma.$transaction([totalCount, recordsFiltered, searchEntry]);

            console.log(`[COMPANY_LIST_DEBUG] Search Results: ${search_entry.length}`);

            return {
                draw,
                recordsTotal: total_count,
                recordsFiltered: records_filtered.length,
                data: search_entry
            }
        } else {
            console.log(`[COMPANY_LIST_DEBUG] Executing non-search query...`);
            const options: any = {
                where: whereCondition,
                include: {
                    _count: {
                        select: {
                            admins: true,
                            customers: true,
                            vehicles: true
                        }
                    },
                    parent_company: true
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

            const [total_count, records_filtered, paginate_data] = await prisma.$transaction([totalCount, recordsFiltered, paginateEntries]);

            console.log(`[COMPANY_LIST_DEBUG] Total: ${total_count}, Filtered: ${records_filtered.length}, Page: ${paginate_data.length}`);

            return {
                draw,
                recordsTotal: total_count,
                recordsFiltered: records_filtered.length,
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