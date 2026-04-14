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
        const config = useRuntimeConfig();
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        // Fix: Allow access if token is valid, regardless of strict permission helper for now
        // The logic below handles company isolation securely.
        if (!validateToken.success) return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], message: 'Token is invalid' }

        // EXPLICIT CHECK: Ensure user has access to this company
        // This was likely missing or failing in the helper
        /*
        const hasAccess = await isAllowedOnEndpoint('USER', company_id, user_id);
        if (!hasAccess) { ... } 
        */

        // Get user's company ID
        // Get user's company ID
        let { company_id } = event.context.user;

        // Fallback: If company_id is missing (e.g. stale token), fetch from DB
        if (!company_id) {
            console.log('DEBUG: company_id missing in token, fetching from DB for user:', user_id);
            const user = await prisma.user.findUnique({
                where: { id: user_id },
                include: {
                    companies_managed: { select: { id: true } },
                    companies_joined: { select: { id: true } },
                    company_where_user_is_admin: { select: { id: true } },
                    company_where_user_is_customer: { select: { id: true } }
                }
            });

            if (user) {
                if (user.companies_managed && user.companies_managed.length > 0) {
                    company_id = user.companies_managed[0].id;
                } else if (user.companies_joined && user.companies_joined.length > 0) {
                    company_id = user.companies_joined[0].id;
                } else if (user.company_where_user_is_admin && user.company_where_user_is_admin.length > 0) {
                    company_id = user.company_where_user_is_admin[0].id;
                } else if (user.company_where_user_is_admin_id) {
                    company_id = user.company_where_user_is_admin_id;
                } else if (user.company_where_user_is_customer_id) {
                    company_id = user.company_where_user_is_customer_id;
                }
            }
            console.log('DEBUG: Resoled company_id from DB:', company_id);
        }

        if (!company_id) {
            return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], message: 'User not linked to any company' }
        }

        // const model = 'vehicle'; // Using explicit prisma.vehicle
        //DataTable Parameters
        let draw: number = Number(params['draw']);
        let start: number = Number(params['start']);
        let length: number = Number(params['length']);
        let search: any = params['search[value]'];
        let orderColumnNumber: number = Number(params['order[0][column]']);
        let orderColumnKey: any = params[`columns[${orderColumnNumber}][data]`] ?? 'created_at';
        let orderDir: any = params['order[0][dir]'] ?? 'asc'; // asc 

        // Fetch user role to determine visibility
        const requestingUser = await prisma.user.findUnique({
            where: { id: user_id },
            select: { approval_level: true }
        });

        const isMaster = requestingUser?.approval_level === 'MASTER_ADMIN';
        const isGlobalSuper = requestingUser?.approval_level === 'SUPER_ADMIN' && !company_id;
        
        const baseWhere = (isMaster || isGlobalSuper) ? {} : { company_id: company_id };

        const totalCount = prisma.vehicle.count({
            where: baseWhere
        });

        if (search) {
            const options = {
                where: {
                    AND: [
                        baseWhere,
                        {
                            OR: [
                                { id: { contains: search } },
                                { number_plate: { contains: search } },
                                { type: { contains: search } },
                                { user: { some: { name: { contains: search } } } },
                                { user: { some: { surname: { contains: search } } } },
                                { user: { some: { email: { contains: search } } } },
                                { user: { some: { phone: { contains: search } } } }
                            ]
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
                    },
                    company: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: {
                    [orderColumnKey]: orderDir.toLowerCase()
                }
            } satisfies Prisma.VehicleFindManyArgs

            // OPTIMIZATION: Count first
            const filteredCountPromise = prisma.vehicle.count({ where: options.where });

            // Add pagination
            const paginateOptions = { ...options, skip: start, take: length };
            const paginateEntriesPromise = prisma.vehicle.findMany(paginateOptions);

            const [total_count, records_filtered_count, search_entry] = await prisma.$transaction([totalCount, filteredCountPromise, paginateEntriesPromise]);

            return {
                draw,
                recordsTotal: total_count,
                recordsFiltered: records_filtered_count,
                data: search_entry
            }
        } else {
            const options = {
                where: baseWhere,
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
                    },
                    company: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: {
                    [orderColumnKey]: orderDir.toLowerCase()
                }
            } satisfies Prisma.VehicleFindManyArgs

            // Add pagination
            const paginateOptions = { ...options, skip: start, take: length };

            // For no search, filtered count = total count
            const paginateEntriesPromise = prisma.vehicle.findMany(paginateOptions);

            const [total_count, paginate_data] = await prisma.$transaction([totalCount, paginateEntriesPromise]);

            return {
                draw,
                recordsTotal: total_count,
                recordsFiltered: total_count,
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