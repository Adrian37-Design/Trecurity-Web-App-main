
import { PrismaClient } from '@prisma/client';
import moment from "moment";

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity',
        },
    },
});

// Helper functions from analytics.get.ts
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

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function main() {
    console.log("=== DEBUGGING ANALYTICS LOGIC ===\n");

    console.log("Connecting to Prisma...");
    const plate = 'AGH0296';
    const vehicle = await prisma.vehicle.findUnique({ where: { number_plate: plate } });
    console.log("Vehicle ID:", vehicle?.id);
    if (!vehicle) { console.error("Vehicle not found"); return; }

    // Hardcoded date range from User request: Dec 1 2025 to Jan 8 2026
    const dateFrom = new Date("2025-12-01T00:00:00Z");
    const dateTo = new Date("2026-01-08T23:59:59Z");

    console.log(`Querying for ${plate} from ${dateFrom.toISOString()} to ${dateTo.toISOString()}`);

    const where = {
        vehicle: { id: vehicle.id },
        OR: [
            { time_from: { gt: dateFrom, lte: dateTo } },
            { time_to: { gt: dateFrom, lte: dateTo } }
        ]
    };

    const getTrackingData = await prisma.trackingData.findMany({
        where,
        select: {
            fuel_level: true, speed: true, mileage: true, state: true,
            time_from: true, time_to: true, lat: true, lon: true, ignition: true, updated_at: true
        },
        orderBy: { time_from: 'asc' }
    });

    console.log(`Found ${getTrackingData.length} raw data points.`);

    // --- COPIED LOGIC START ---

    // Pre-calculate distance
    const enrichedTrackingData = getTrackingData.map((point, index, array) => {
        let dist = 0;
        if (index > 0 && point.lat && point.lon && array[index - 1].lat && array[index - 1].lon) {
            dist = haversineDistance(
                array[index - 1].lat,
                array[index - 1].lon,
                point.lat,
                point.lon
            );
        }
        return { ...point, delta_distance: dist };
    });

    let totalEnricheddist = 0;
    enrichedTrackingData.forEach(p => totalEnricheddist += p.delta_distance);
    console.log(`Enriched Total Delta Distance (Pre-Bucket): ${totalEnricheddist} km`);

    const diff = moment(dateTo).diff(dateFrom, 'minutes')
    let interval_groups: any = Array.from({ length: Math.floor(diff / 30) }, (_, k) => {
        return moment(floorTime(dateFrom)).add((30 * (k + 1)), 'minutes').toDate()
    })
    interval_groups = [floorTime(dateFrom), ...interval_groups, floorTime(dateTo)]
    interval_groups = interval_groups.map(i => i.toString())
    interval_groups = [...new Set(interval_groups)]

    interval_groups = interval_groups
        .map((interval_group: string) => {
            return {
                interval_group,
                data: enrichedTrackingData.filter(({ time_from, time_to }) => {
                    return (new Date(time_from) > moment(new Date(interval_group)).subtract(30, 'minutes').toDate() && new Date(time_from) <= new Date(interval_group)) || (new Date(time_to) > moment(new Date(interval_group)).subtract(30, 'minutes').toDate() && new Date(time_to) <= new Date(interval_group)) || (new Date(interval_group) > new Date(time_from) && new Date(interval_group) <= new Date(time_to))
                })
            }
        })
        .map(({ interval_group, data }) => {
            return {
                interval_group,
                data: data.reduce((agg, i: any, index: number, array: any[]) => {
                    if (i?.fuel_level) agg.fuel_level = [...agg.fuel_level, i.fuel_level]
                    if (i?.speed) agg.speed = [...agg.speed, i.speed]
                    if (i?.state === 'MOVING') agg.drive_time = [...agg.drive_time, setMaximumCap(moment(i.time_to).diff(i.time_from, 'minutes'), 30)]
                    if (i?.state === 'STATIONARY') agg.park_time = [...agg.park_time, setMaximumCap(moment(i.time_to).diff(i.time_from, 'minutes'), 30)]

                    if (i?.ignition === true) {
                        const hours = setMaximumCap(moment(i.time_to).diff(i.time_from, 'minutes'), 30);
                        agg.operating_hours = [...agg.operating_hours, hours];
                    }

                    // Add pre-calculated distance
                    if (i.delta_distance) {
                        agg.drive_mileage += i.delta_distance;
                    }

                    return agg
                }, {
                    fuel_level: [], speed: [], drive_time: [],
                    drive_mileage: 0,
                    park_time: [], operating_hours: []
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
            if (item.data.drive_mileage === 0) item.data.drive_mileage = null;
            return item;
        });

    // --- COPIED LOGIC END ---

    console.log("Checking final interval groups that have mileage:");
    const mileageIntervals = interval_groups.filter(g => g.data.drive_mileage !== null);

    mileageIntervals.forEach(g => {
        console.log(`  [${g.interval_group}] Mileage: ${g.data.drive_mileage}`);
    });

    if (mileageIntervals.length === 0) {
        console.log("❌ NO INTERVALS HAVE MILEAGE.");
    } else {
        const total = mileageIntervals.reduce((acc, curr) => acc + curr.data.drive_mileage, 0);
        console.log(`✅ Total Final Mileage: ${total} km`);
    }

    console.log("\nChecking intervals with Operating Hours:");
    const opHoursIntervals = interval_groups.filter(g => g.data.operating_hours !== null);
    opHoursIntervals.forEach(g => {
        console.log(`  [${g.interval_group}] Op. Hours: ${g.data.operating_hours.toFixed(2)} min`);
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
