import { checkAppJwtToken } from "~/vendors/jwt";
import { isAllowedOnEndpoint } from "~/vendors/permission";
import { prisma } from "~~/prisma/db";
import { Prisma } from "@prisma/client";

export default defineEventHandler(async (event) => {
    try {
        // const model = 'vehicle'; // Using explicit access
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

        // Check if this user has access to this endpoint
        if (!await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) {
            console.log("DEBUG_VEHICLE_TABLE: Permission Denied for user", user_id);
            return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], error: 'User does not have permission' }
        }

        console.log("DEBUG_VEHICLE_TABLE: Access Granted for user", user_id);

        //DataTable Parameters
        let draw: number = Number(params['draw']);
        let start: number = Number(params['start']);
        let length: number = Number(params['length']);
        let search: any = params['search[value]'];
        let orderColumnNumber: number = Number(params['order[0][column]']);
        let orderColumnKey: any = params[`columns[${orderColumnNumber}][data]`] ?? 'created_at';
        let orderDir: any = params['order[0][dir]'] ?? 'asc'; // asc 

        // Validate Sort Key (Prevent sorting by relations like tracking_data which causes 500)
        const allowedSortKeys = ['number_plate', 'type', 'status', 'last_seen', 'created_at'];
        if (!allowedSortKeys.includes(orderColumnKey)) {
            orderColumnKey = 'created_at';
        }

        const totalCount = prisma.vehicle.count();

        if (search) {
            const options = {
                where: {
                    AND: [
                        validateToken.company_id ? { company_id: validateToken.company_id } : {},
                        // {
                        //    company: {
                        //        status: true
                        //    }
                        // }
                    ],
                    OR: [
                        { id: { contains: search } },
                        { number_plate: { contains: search } },
                        { type: { contains: search } },
                        { user: { some: { name: { contains: search } } } },
                        { user: { some: { surname: { contains: search } } } },
                        { user: { some: { email: { contains: search } } } },
                        { user: { some: { phone: { contains: search } } } },
                        { company: { name: { contains: search } } }
                    ]
                },
                include: {
                    company: true,
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
                            time_to: 'desc'
                        },
                        take: 1
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
            const searchEntryPromise = prisma.vehicle.findMany(paginateOptions);

            const [total_count, records_filtered_count, search_entry] = await prisma.$transaction([totalCount, filteredCountPromise, searchEntryPromise]);

            return {
                draw,
                recordsTotal: total_count,
                recordsFiltered: records_filtered_count,
                data: search_entry
            }
        } else {
            const options = {
                where: {
                    AND: [
                        validateToken.company_id ? { company_id: validateToken.company_id } : {},
                    ]
                    // company: {
                    //    status: true
                    // }
                },
                include: {
                    company: true,
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
                            time_to: 'desc'
                        },
                        take: 1
                    }
                },
                orderBy: {
                    [orderColumnKey]: orderDir.toLowerCase()
                }
            } satisfies Prisma.VehicleFindManyArgs

            // For no search, filtered count = total count (if status constraint matches total)
            // Wait, totalCount above is total in DB.
            // recordsFiltered should be count with status=true.
            const filteredCountPromise = prisma.vehicle.count({ where: options.where });

            // Add pagination
            const paginateOptions = { ...options, skip: start, take: length };
            const paginateEntriesPromise = prisma.vehicle.findMany(paginateOptions);

            const [total_count, records_filtered_count, paginate_data] = await prisma.$transaction([totalCount, filteredCountPromise, paginateEntriesPromise]);

            return {
                draw,
                recordsTotal: total_count,
                recordsFiltered: records_filtered_count,
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