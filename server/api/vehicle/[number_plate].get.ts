import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import moment from "moment";
import { isAllowedOnEndpoint } from '~/vendors/permission';

export default defineEventHandler(async (event) => {
    try {

        // auth
        const user_id = event.context.user?.id;
        if (!user_id) {
            setResponseStatus(event, 401);
            return;
        }



        // Destruct body
        const { number_plate } = getRouterParams(event);

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

        const isSuperOrMaster = user?.approval_level === 'SUPER_ADMIN' || user?.approval_level === 'MASTER_ADMIN';

        // Check if this user has access to this endpoint
        // Allow if user is assigned to vehicle OR vehicle belongs to user's company OR user is SuperAdmin
        const hasAccess = await prisma.vehicle.count({
            where: {
                AND: [
                    { number_plate },
                    {
                        OR: [
                            { user: { some: { id: user_id } } },
                            { company_id: company_id ? company_id : undefined }
                        ]
                    }
                ]
            }
        });

        if (!hasAccess && !isSuperOrMaster)
            return {
                data: {},
                message: `User does not have permission. Company ID: ${company_id} | User ID: ${user_id}`,
                success: false
            }

        const vehicle = await prisma.vehicle.findUnique({
            where: {
                number_plate
            },
            include: {
                user: {
                    where: {
                        status: true
                    },
                    select: {
                        name: true,
                        surname: true,
                        email: true
                    }
                },
                company: {
                    select: {
                        name: true
                    }
                },
                tracking_data: {
                    take: 1,
                    orderBy: {
                        time_to: 'desc'
                    }
                },
                controller_command: {
                    take: 1,
                    orderBy: {
                        created_at: 'desc'
                    }
                },
                _count: {
                    select: {
                        controller_command: {
                            where: {
                                is_executed: false
                            }
                        }
                    }
                },
                route: true,
                geofence: true,
            }
        });

        // Calculate total mileage from all tracking data
        const trackingDataForMileage = await prisma.trackingData.findMany({
            where: { vehicle: { number_plate } },
            select: { lat: true, lon: true, ignition: true, time_from: true, time_to: true },
            orderBy: { time_from: 'asc' }
        });

        let total_mileage = 0;
        let total_operating_hours = 0; // in minutes

        // Calculate mileage from consecutive GPS points
        for (let i = 1; i < trackingDataForMileage.length; i++) {
            const p1 = trackingDataForMileage[i - 1];
            const p2 = trackingDataForMileage[i];

            if (p1.lat && p1.lon && p2.lat && p2.lon) {
                total_mileage += haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
            }
        }

        // Calculate operating hours from ALL records where ignition was on
        for (const record of trackingDataForMileage) {
            if (record.ignition === true && record.time_from && record.time_to) {
                const diffMinutes = moment(record.time_to).diff(moment(record.time_from), 'minutes');
                total_operating_hours += diffMinutes;
            }
        }

        // Convert operating hours from minutes to hours for display
        const operating_hours_display = (total_operating_hours / 60).toFixed(1);

        return {
            data: {
                ...vehicle,
                total_mileage: total_mileage.toFixed(2),
                total_operating_hours: operating_hours_display
            },
            message: "",
            success: true
        }

    } catch (error) {
        console.error("[VEHICLE_DETAIL_ERROR]", error);
        setResponseStatus(event, 500);

        return {
            data: {},
            message: "Server Error: " + (error instanceof Error ? error.message : "Unknown error"),
            success: false
        }
    }
});

// Calculate distance between two GPS coordinates using Haversine formula
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}
