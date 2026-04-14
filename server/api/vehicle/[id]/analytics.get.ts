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
            vehicle: {
                OR: [
                    { id: id },
                    { number_plate: id }
                ]
            },
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

        if (!event.context.user) {
            setResponseStatus(event, 401);
            return { data: {}, message: 'User not authenticated', success: false };
        }

        const approvalLevel = event.context.user.approval_level;

        if (approvalLevel === ApprovalLevel.COMPANY_ADMIN || approvalLevel === ApprovalLevel.USER) {
            where.vehicle = {
                ...where.vehicle,
                company_id: company_id
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

        // Pre-calculate distance and time for every point relative to the previous point in the global set
        const enrichedTrackingData = getTrackingData.map((point, index, array) => {
            let dist = 0;
            let deltaTime = 0;
            if (index > 0) {
                // Calculate distance
                // Determine effective state for this point
                const effectiveState = (point.state === 'MOVING' || point.state === 'STATIONARY') ? point.state : ((point.speed || 0) > 0 ? 'MOVING' : 'STATIONARY');

                if (point.lat && point.lon && array[index - 1].lat && array[index - 1].lon) {
                    // Only calculate distance if the vehicle is moving to prevent GPS drift from accumulating
                    if (effectiveState === 'MOVING' || (point.speed || 0) > 0) {
                        dist = haversineDistance(
                            array[index - 1].lat,
                            array[index - 1].lon,
                            point.lat,
                            point.lon
                        );
                    }
                }

                // Calculate time difference in fractional minutes
                const timeDiff = moment(point.time_from).diff(moment(array[index - 1].time_from), 'minutes', true);
                
                // --- GAP LOGIC FIX (V5) ---
                // Improved ignition parsing to handle more data types (strings, numbers, booleans).
                const isIgnitionOn = point.ignition === true || point.ignition === 'true' || point.ignition === 1 || point.ignition === '1';
                const isPrevIgnitionOff = (array[index - 1].ignition === false || array[index - 1].ignition === 'false' || array[index - 1].ignition === 0 || array[index - 1].ignition === '0');
                const gapThreshold = (isIgnitionOn && !isPrevIgnitionOff) ? 720 : 30; // 720 mins = 12 hours
                
                deltaTime = (timeDiff > 0 && timeDiff <= gapThreshold) ? timeDiff : 0;
            } else {
                // --- BASELINE FIX (V6) ---
                // If it's the first point and Ignition is ON, give a 5-min baseline.
                const isIgnitionOn = point.ignition === true || point.ignition === 'true' || point.ignition === 1 || point.ignition === '1';
                if (isIgnitionOn) deltaTime = 5;
            }

            const pTime = new Date(point.time_from);
            return {
                ...point,
                delta_distance: dist,
                delta_time: deltaTime,
                window_end: pTime,
                window_start: moment(pTime).subtract(deltaTime, 'minutes').toDate()
            };
        });

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
                const iStart = moment(new Date(interval_group)).subtract(30, 'minutes').toDate();
                const iEnd = new Date(interval_group);

                return {
                    interval_group,
                    data: enrichedTrackingData.map(pt => {
                        // --- PROPORTIONAL DISTRIBUTION (V6) ---
                        // Calculate how many minutes of this point's window overlap this 30-min interval
                        const overlapStart = Math.max(pt.window_start.getTime(), iStart.getTime());
                        const overlapEnd = Math.min(pt.window_end.getTime(), iEnd.getTime());
                        const overlapMins = Math.max(0, (overlapEnd - overlapStart) / (1000 * 60));

                        if (overlapMins > 0) {
                            // If the point overlaps, contribute its proportional delta to this interval
                            return { 
                                ...pt, 
                                delta_time: overlapMins, 
                                // Distance is harder to distribute accurately without path analysis, 
                                // so we keep it in the interval where the report actually landed.
                                delta_distance: (pt.window_end > iStart && pt.window_end <= iEnd) ? pt.delta_distance : 0 
                            };
                        }
                        return null;
                    }).filter(x => x !== null)
                }
            })
            // Create a summation of the variables of tracking data in each 30 interval
            .map(({ interval_group, data }) => {
                return {
                    interval_group,
                    data: data.reduce((agg, i: any, index: number, array: any[]) => {
                        if (i?.fuel_level) agg.fuel_level = [...agg.fuel_level, i.fuel_level]
                        if (i?.speed) agg.speed = [...agg.speed, i.speed]
                        const effectiveState = (i?.state === 'MOVING' || i?.state === 'STATIONARY') ? i.state : ((i?.speed || 0) > 0 ? 'MOVING' : 'STATIONARY');
                        if (effectiveState === 'MOVING') agg.drive_time = [...agg.drive_time, i.delta_time || 0]
                        if (effectiveState === 'STATIONARY') agg.park_time = [...agg.park_time, i.delta_time || 0]

                        // Calculate operating hours (ONLY ignition-based, detached from movement)
                        const isIgnitionOn = i.ignition === true || i.ignition === 'true' || i.ignition === 1 || i.ignition === '1';
                        if (isIgnitionOn) {
                            agg.operating_hours = [...agg.operating_hours, i.delta_time || 0];
                        }

                        // Add pre-calculated distance
                        if (i.delta_distance) {
                            agg.drive_mileage += i.delta_distance;
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

                ["fuel_level", "speed"].forEach(key => {
                    item.data[key] = item.data[key].length > 0 ? getAverage(item.data[key]) : null
                });

                ["drive_time", "park_time", "operating_hours"].forEach(key => {
                    item.data[key] = item.data[key].length > 0 ? getSum(item.data[key]) : null
                });

                // Note: drive_mileage is preserved as a number (sum of deltas) for the next step
                return item;
            });

        // ---------------------------------------------------------
        // Post-Processing: Calculate Daily Cumulative Mileage
        // ---------------------------------------------------------
        let current_day = "";
        let daily_cumulative_mileage = 0;
        let daily_cumulative_drive_time = 0;
        let daily_cumulative_park_time = 0;
        let daily_cumulative_operating_hours = 0;

        interval_groups = interval_groups.map(item => {
            const dateObj = new Date(item.interval_group);
            const dateStr = moment(dateObj).format('YYYY-MM-DD');

            if (dateStr !== current_day) {
                // New Day: Reset Accumulators
                current_day = dateStr;
                daily_cumulative_mileage = 0;
                daily_cumulative_drive_time = 0;
                daily_cumulative_park_time = 0;
                daily_cumulative_operating_hours = 0;
            }

            // Add the incremental distance from this interval
            const incremental_mileage = item.data.drive_mileage || 0;
            daily_cumulative_mileage += incremental_mileage;
            item.data.drive_mileage = daily_cumulative_mileage;

            // Add the incremental time from this interval
            const incremental_drive_time = item.data.drive_time || 0;
            daily_cumulative_drive_time += incremental_drive_time;
            item.data.drive_time = Number((daily_cumulative_drive_time / 60).toFixed(2));

            const incremental_park_time = item.data.park_time || 0;
            daily_cumulative_park_time += incremental_park_time;
            item.data.park_time = Number((daily_cumulative_park_time / 60).toFixed(2));

            const incremental_operating_hours = item.data.operating_hours || 0;
            daily_cumulative_operating_hours += incremental_operating_hours;
            item.data.operating_hours = Number((daily_cumulative_operating_hours / 60).toFixed(2));

            return item;
        });

        return {
            version: 'v6-distributed',
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

const getSum = (arr: number[]) => {
    return arr.reduce((sum, i) => sum + i, 0)
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
