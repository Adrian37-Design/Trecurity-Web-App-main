import { checkAppJwtToken } from "~/vendors/jwt";
import { isAllowedOnEndpoint } from "~/vendors/permission";
import { prisma } from "~~/prisma/db";
import { Prisma } from "@prisma/client";

export default defineEventHandler(async (event) => {

    try {
        const model = 'user';
        const params = getQuery(event);


        // auth
        if (!event.context.user) {
            // Return 200 to prevent frontend refresh loop
            return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], message: 'Token is invalid', error: 'Token is invalid' }
        }

        const user_id: string = event.context.user.id;

        // Check if this user has access to this endpoint
        if (!await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [], error: 'User does not have permission' }

        //DataTable Parameters
        let draw: number = Number(params['draw']);
        let start: number = Number(params['start']);
        let length: number = Number(params['length']);
        let search: any = params['search[value]'];
        let orderColumnNumber: number = Number(params['order[0][column]']);
        let orderColumnKey: any = params[`columns[${orderColumnNumber}][data]`] ?? 'created_at';
        let orderDir: any = params['order[0][dir]'] ?? 'asc'; // asc 

        const totalCount = prisma[model].count();

        if (search) {
            const options = {
                where: {
                    AND: [
                        // If current user is SUPER_ADMIN (not MASTER_ADMIN), exclude MASTER_ADMIN users
                        event.context.user.approval_level === 'SUPER_ADMIN' ? {
                            approval_level: {
                                not: 'MASTER_ADMIN'
                            }
                        } : {},
                        // Filter by Company Context
                        event.context.user.company_id ? {
                            OR: [
                                { company_where_user_is_admin_id: event.context.user.company_id },
                                { company_where_user_is_customer_id: event.context.user.company_id }
                            ]
                        } : {},
                        {
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
                    "${orderColumnKey}": "${orderDir.toLowerCase()}"
                }`)
            } satisfies Prisma.UserFindManyArgs

            const recordsFiltered = prisma[model].findMany(Object.assign({}, options));

            // Add pagination
            //@ts-ignore
            options.skip = start;
            //@ts-ignore
            options.take = length;

            const searchEntry = prisma[model].findMany(options);

            const [total_count, records_filtered, search_entry] = await prisma.$transaction([totalCount, recordsFiltered, searchEntry]);

            // Manually add vehicle counts for each user based on their company
            const usersWithVehicleCounts = await Promise.all(
                search_entry.map(async (user: any) => {
                    const companyId = user.company_where_user_is_admin?.id || user.company_where_user_is_customer?.id;

                    let vehicleCount = 0;
                    if (companyId) {
                        vehicleCount = await prisma.vehicle.count({
                            where: {
                                company_id: companyId,
                                company: {
                                    status: true
                                }
                            }
                        });
                    }

                    return {
                        ...user,
                        _count: {
                            vehicles: vehicleCount
                        }
                    };
                })
            );

            return {
                draw,
                recordsTotal: total_count,
                recordsFiltered: records_filtered.length,
                data: usersWithVehicleCounts
            }
        } else {
            const options = {
                where: {
                    AND: [
                        event.context.user.approval_level === 'SUPER_ADMIN' ? {
                            approval_level: {
                                not: 'MASTER_ADMIN'
                            }
                        } : {},
                        // Filter by Company Context
                        event.context.user.company_id ? {
                            OR: [
                                { company_where_user_is_admin_id: event.context.user.company_id },
                                { company_where_user_is_customer_id: event.context.user.company_id }
                            ]
                        } : {}
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
                    "${orderColumnKey}": "${orderDir.toLowerCase()}"
                }`)
            } satisfies Prisma.UserFindManyArgs

            const recordsFiltered = prisma[model].findMany(Object.assign({}, options));

            // Add pagination
            //@ts-ignore
            options.skip = start;
            //@ts-ignore
            options.take = length;

            const paginateEntries = prisma[model].findMany(options);

            const [total_count, records_filtered, paginate_data] = await prisma.$transaction([totalCount, recordsFiltered, paginateEntries]);

            // Manually add vehicle counts for each user based on their company
            const usersWithVehicleCounts = await Promise.all(
                paginate_data.map(async (user: any) => {
                    const companyId = user.company_where_user_is_admin?.id || user.company_where_user_is_customer?.id;

                    let vehicleCount = 0;
                    if (companyId) {
                        vehicleCount = await prisma.vehicle.count({
                            where: {
                                company_id: companyId,
                                company: {
                                    status: true
                                }
                            }
                        });
                    }

                    return {
                        ...user,
                        _count: {
                            vehicles: vehicleCount
                        }
                    };
                })
            );

            return {
                draw,
                recordsTotal: total_count,
                recordsFiltered: records_filtered.length,
                data: usersWithVehicleCounts
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