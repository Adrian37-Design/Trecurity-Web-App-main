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
                user_id,
                ...dateFilter
            }
        });

        if (search) {
            const options = {
                where: {
                    user_id,
                    ...dateFilter,
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
                    user_id,
                    ...dateFilter
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