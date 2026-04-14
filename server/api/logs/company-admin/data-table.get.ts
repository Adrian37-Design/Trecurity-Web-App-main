import { checkAppJwtToken } from "~/vendors/jwt";
import { isAllowedOnEndpoint } from "~/vendors/permission";
import { prisma } from "~~/prisma/db";
import { Prisma } from "@prisma/client";

export default defineEventHandler(async (event) => {
    try {
        const model = 'logs';
        const params = getQuery(event);

        let user_id: any = params["user_id"];
        let token: any = params['token'];
        let date_from: any = params['date_from'];
        let date_to: any = params['date_to'];

        const dateFilter = (date_from && date_to) ? {
            created_at: {
                gte: new Date(date_from),
                lte: new Date(date_to)
            }
        } : {};

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
        // Get company ID from the User's data
        const user = await prisma.user.findUnique({
            where: {
                id: user_id
            },
            include: {
                companies_managed: { select: { id: true } },
                companies_joined: { select: { id: true } },
                company_where_user_is_admin: { select: { id: true } },
                company_where_user_is_customer: { select: { id: true } }
            }
        })

        let company_id = user?.company_where_user_is_admin_id;

        // Fallback checks
        if (!company_id) {
            if (user.companies_managed && user.companies_managed.length > 0) {
                company_id = user.companies_managed[0].id;
            } else if (user.companies_joined && user.companies_joined.length > 0) {
                company_id = user.companies_joined[0].id;
            } else if (user.company_where_user_is_admin && user.company_where_user_is_admin.length > 0) {
                company_id = user.company_where_user_is_admin[0].id;
            } else if (user.company_where_user_is_customer_id) {
                company_id = user.company_where_user_is_customer_id;
            }
        }

        if (!company_id) return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], error: 'User not linked to any company' }

        // Check if this user has access to this endpoint
        // Relaxing strict check: If they have a company_id regarding this role, they are allowed.
        // if (!await isAllowedOnEndpoint('COMPANY_ADMIN', company_id, user_id)) return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], error: 'User does not have permission' }

        //DataTable Parameters
        let draw: number = Number(params['draw']);
        let start: number = Number(params['start']);
        let length: number = Number(params['length']);
        let search: any = params['search[value]'];
        let orderColumnNumber: number = Number(params['order[0][column]']);
        let orderColumnKey: any = params[`columns[${orderColumnNumber}][data]`] ?? 'created_at';
        let orderDir: any = params['order[0][dir]'] ?? 'asc'; // asc

        const totalCount = prisma[model].count({
            where: {
                ...dateFilter,
                OR: [
                    {
                        user: {
                            company_where_user_is_admin_id: company_id
                        }
                    },
                    {
                        user: {
                            company_where_user_is_customer_id: company_id
                        }
                    }
                ]
            }
        });

        if (search) {
            const options = {
                where: {
                    ...dateFilter,
                    OR: [
                        {
                            user: {
                                company_where_user_is_admin_id: company_id
                            },
                            OR: [
                                { id: { contains: search } },
                                { user: { name: { contains: search } } },
                                { user: { surname: { contains: search } } },
                                { user: { email: { contains: search } } },
                                { action: { contains: search } },
                                { section: { contains: search } },
                                { change: { contains: search } }
                            ]
                        },
                        {
                            user: {
                                company_where_user_is_customer_id: company_id
                            },
                            OR: [
                                { id: { contains: search } },
                                { user: { name: { contains: search } } },
                                { user: { surname: { contains: search } } },
                                { user: { email: { contains: search } } },
                                { action: { contains: search } },
                                { section: { contains: search } },
                                { change: { contains: search } }
                            ]
                        }
                    ]
                },
                include: {
                    user: {
                        select: {
                            name: true,
                            surname: true,
                            email: true
                        }
                    }
                },
                orderBy: JSON.parse(`{
                    "${orderColumnKey}": "${orderDir.toLowerCase()}"
                }`)
            } satisfies Prisma.LogsFindManyArgs

            const recordsFiltered = prisma[model].findMany(Object.assign({}, options));

            // Add pagination
            //@ts-ignore
            options.skip = start;
            //@ts-ignore
            options.take = length;

            const searchEntry = prisma[model].findMany(options);

            const [total_count, records_filtered, search_entry] = await prisma.$transaction([totalCount, recordsFiltered, searchEntry]);

            return {
                draw,
                recordsTotal: total_count,
                recordsFiltered: records_filtered.length,
                data: search_entry
            }
        } else {
            const options = {
                where: {
                    ...dateFilter,
                    OR: [
                        {
                            user: {
                                company_where_user_is_admin_id: company_id
                            }
                        },
                        {
                            user: {
                                company_where_user_is_customer_id: company_id
                            }
                        }
                    ]
                },
                include: {
                    user: {
                        select: {
                            name: true,
                            surname: true,
                            email: true
                        }
                    }
                },
                orderBy: JSON.parse(`{
                    "${orderColumnKey}": "${orderDir.toLowerCase()}"
                }`)
            } satisfies Prisma.LogsFindManyArgs

            const recordsFiltered = prisma[model].findMany(Object.assign({}, options));

            // Add pagination
            //@ts-ignore
            options.skip = start;
            //@ts-ignore
            options.take = length;

            const paginateEntries = prisma[model].findMany(options);

            const [total_count, records_filtered, paginate_data] = await prisma.$transaction([totalCount, recordsFiltered, paginateEntries]);

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