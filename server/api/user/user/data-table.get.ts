import { checkAppJwtToken } from "~/vendors/jwt";
import { prisma } from "~~/prisma/db";
import { Prisma } from "@prisma/client";

export default defineEventHandler(async (event) => {
    try {
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

        if (!validateToken.success) return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], message: 'Token is invalid' }

        // Get user's company ID
        let { company_id } = event.context.user;

        // Fallback: If company_id is missing (e.g. stale token), fetch from DB
        if (!company_id) {
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
        }

        if (!company_id) {
            return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], message: 'User not linked to any company' }
        }

        //DataTable Parameters
        let draw: number = Number(params['draw']);
        let start: number = Number(params['start']);
        let length: number = Number(params['length']);
        let search: any = params['search[value]'];
        let orderColumnNumber: number = Number(params['order[0][column]']);
        let orderColumnKey: any = params[`columns[${orderColumnNumber}][data]`] ?? 'created_at';
        let orderDir: any = params['order[0][dir]'] ?? 'asc';

        // Base Where: Filter by Company ID (checking both admin and customer relations for completeness, or just implicit presence in company)
        // For User List in a company, we want all users linked to this company.
        // Prisma schema usually links users to company via companies_joined, companies_managed, etc.
        // A simple approach is: find users where company_id matches via relation.

        // However, User model doesn't have a direct `company_id` field usually, it uses many-to-many or one-to-many.
        // Let's look at how CompanyAdmin does it.
        // Actually, we can use the reverse relation filter.

        const baseWhere: Prisma.UserWhereInput = {
            OR: [
                { company_where_user_is_admin_id: company_id }, // Legacy/Direct
                { company_where_user_is_customer_id: company_id }, // Legacy/Direct
                { companies_managed: { some: { id: company_id } } },
                { companies_joined: { some: { id: company_id } } }
            ],
            // Hide Super Admins and deleted/hidden users if necessary
            status: true,
            approval_level: { not: 'SUPER_ADMIN' }
        };

        const totalCount = prisma.user.count({
            where: baseWhere
        });

        if (search) {
            const options = {
                where: {
                    AND: [
                        baseWhere,
                        {
                            OR: [
                                { name: { contains: search } },
                                { surname: { contains: search } },
                                { email: { contains: search } },
                                { phone: { contains: search } }
                            ]
                        }
                    ]
                },
                orderBy: {
                    [orderColumnKey]: orderDir.toLowerCase()
                }
            } satisfies Prisma.UserFindManyArgs

            // OPTIMIZATION: Count first
            const filteredCountPromise = prisma.user.count({ where: options.where });

            // Add pagination
            const paginateOptions = { ...options, skip: start, take: length };
            const paginateEntriesPromise = prisma.user.findMany(paginateOptions);

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
                orderBy: {
                    [orderColumnKey]: orderDir.toLowerCase()
                }
            } satisfies Prisma.UserFindManyArgs

            // Add pagination
            const paginateOptions = { ...options, skip: start, take: length };

            // For no search, filtered count = total count
            const paginateEntriesPromise = prisma.user.findMany(paginateOptions);

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
