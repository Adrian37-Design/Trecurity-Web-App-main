import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { isAllowedOnEndpoint } from '~/vendors/permission';
import moment from "moment";
import { ApprovalLevel, type TrackingData } from "@prisma/client";
import Joi from "@xavisoft/joi";

export default defineEventHandler(async (event) => {
    try {

        // auth
        const user_id = event.context.user?.id;
        if (!user_id) {
            setResponseStatus(event, 401);
            return;
        }

        // validate request
        const query = getQuery(event);

        const schema = {
            date_from: Joi.date().required(),
            date_to: Joi.date().required()
        }

        const error = Joi.getError(query, schema);
        if (error) {
            setResponseStatus(event, 400);
            return { message: error }
        }

        // retrieve
        /// build query
        const { id } = getRouterParams(event);
        const { date_from, date_to } = query;
        const dateFrom = new Date(date_from.toString());
        const dateTo = new Date(date_to.toString());

        const where = {
            vehicle: { id },
            OR: [
                {
                    time_from: {
                        gt: dateFrom,
                        lte: dateTo
                    }
                },
                {
                    time_to: {
                        gt: dateFrom,
                        lte: dateTo
                    }
                }
            ]
        } as any;

        /// auth
        const company_id: string = event.context.company_id;
        const approvalLevel = event.context.user.approval_level;

        if (approvalLevel === ApprovalLevel.COMPANY_ADMIN) {
            where.vehicle = {
                ...where.vehicle,
                company_id: company_id
            };
        } else if (approvalLevel === ApprovalLevel.USER) {
            where.vehicle = {
                ...where.vehicle,
                user: {
                    some: { id: user_id }
                }
            };
        }

        /// retrieve
        const getTrackingData = await prisma.trackingData.findMany({
            where,
            select: {
                fuel_level: true,
                speed: true,
                mileage: true,
                state: true,
                time_from: true,
                time_to: true,
                lat: true,
                lon: true,
                ignition: true,
                updated_at: true
            },
            orderBy: {
                time_from: 'asc'  // Sort by time to calculate distance between consecutive points
            }
        })

        /// format
        //// Group data into 30 minute intervals from date_from to date_to
        const diff = moment(dateTo).diff(dateFrom, 'minutes')

        //// Create the 30 minute intervals
        let interval_groups: any = Array.from({ length: Math.floor(diff / 30) }, (_, k) => {
            return moment(floorTime(dateFrom)).add((30 * (k + 1)), 'minutes').toDate()
        })

        interval_groups = [floorTime(dateFrom), ...interval_groups, floorTime(dateTo)]

        //// Remove duplicate dates
        interval_groups = interval_groups.map(i => i.toString())

        interval_groups = [...new Set(interval_groups)]

        //// Assign each tracking data into the most appropriate interval according to its time_from and time_to
        interval_groups = interval_groups
            .map((interval_group: string) => {
                return {
                    interval_group,
                    data: getTrackingData.filter(({ time_from, time_to }) => {
                        return (new Date(time_from) > moment(new Date(interval_group)).subtract(30, 'minutes').toDate() && new Date(time_from) <= new Date(interval_group)) || (new Date(time_to) > moment(new Date(interval_group)).subtract(30, 'minutes').toDate() && new Date(time_to) <= new Date(interval_group)) || (new Date(interval_group) > new Date(time_from) && new Date(interval_group) <= new Date(time_to))
                    })
                }
            })
            // Create a summation of the variables of tracking data in each 30 interval
            .map(({ interval_group, data }) => {
                return {
                    interval_group,
                    data: data.reduce((agg, i: TrackingData, index: number, array: TrackingData[]) => {
                        if (i?.fuel_level) agg.fuel_level = [...agg.fuel_level, i.fuel_level]
                        if (i?.speed) agg.speed = [...agg.speed, i.speed]
                        if (i?.state === 'MOVING') agg.drive_time = [...agg.drive_time, setMaximumCap(moment(i.time_to).diff(i.time_from, 'minutes'), 30)]
                        if (i?.state === 'STATIONARY') agg.park_time = [...agg.park_time, setMaximumCap(moment(i.time_to).diff(i.time_from, 'minutes'), 30)]

                        // Calculate operating hours (when ignition is ON, regardless of movement)
                        if (i?.ignition === true) {
                            const hours = setMaximumCap(moment(i.time_to).diff(i.time_from, 'minutes'), 30);
                            agg.operating_hours = [...agg.operating_hours, hours];
                        }

                        // Calculate distance from previous point using Haversine formula
                        if (index > 0 && i?.lat && i?.lon && array[index - 1]?.lat && array[index - 1]?.lon) {
                            const distance = haversineDistance(
                                array[index - 1].lat,
                                array[index - 1].lon,
                                i.lat,
                                i.lon
                            );
                            agg.drive_mileage += distance;
                        }

                        return agg
                    }, {
                        fuel_level: [],
                        speed: [],
                        drive_time: [],
                        drive_mileage: 0,  // Changed from array to number for total distance
                        park_time: [],
                        operating_hours: []
                    })
                }
            })
            .map(item => {

                ["fuel_level", "speed", "drive_time", "park_time", "operating_hours"].forEach(key => {
                    item.data[key] = item.data[key].length > 0 ? getAverage(item.data[key]) : null
                });

                // drive_mileage is already a total, not an average
                if (item.data.drive_mileage === 0) item.data.drive_mileage = null;

                return item;
            });

        return {
            data: interval_groups
        }

    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);

        return {
            data: [],
            message: "Server Error. Please try again later",
            success: false
        }
    }
});

const floorTime = (time: Date | string | number) => {
    const date = new Date(time)

    if (date.getMinutes() <= 30 || (date.getMinutes() === 30 && date.getSeconds() === 0 && date.getMilliseconds() === 0)) {
        date.setMinutes(30, 0, 0)
    } else {
        date.setHours(date.getHours() + 1)
        date.setMinutes(0, 0, 0)
    }

    return date
}

const getAverage = (arr: number[]) => {
    return arr.reduce((sum, i) => sum + i, 0) / arr.length
}

const setMaximumCap = (value: number, max: number) => value > max ? max : value

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
