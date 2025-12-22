import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // Normalize to array (accept single object or array)
        const dataPoints = Array.isArray(body) ? body : [body];

        if (dataPoints.length === 0) {
            setResponseStatus(event, 400);
            return { success: false, message: "No data provided" };
        }

        // Validate first point has required fields
        const first = dataPoints[0];
        if (!first.vehicle_id || first.lat === undefined || first.lon === undefined || !first.time_from) {
            setResponseStatus(event, 400);
            return { success: false, message: "Missing required fields: vehicle_id, lat, lon, time_from" };
        }

        // Save all points to TrackingData history
        for (const point of dataPoints) {
            await prisma.trackingData.create({
                data: {
                    vehicle_id: point.vehicle_id,
                    lat: point.lat,
                    lon: point.lon,
                    speed: point.speed || 0,
                    time_from: new Date(point.time_from),
                    time_to: new Date(point.time_to || point.time_from),
                    altitude: point.altitude || 0,
                    course: point.course || 0,
                    hdop: point.hdop || 0,
                    signal_strength: point.signal_strength || 0,
                    satellites: point.satellites || 0,
                    ip_address: point.ip_address || "unknown",
                    state: point.state || "MOVING",
                    age: point.age || 0,
                    battery_percentage: point.battery_percentage,
                    fuel_level: point.fuel_level,
                    mileage: point.mileage,
                    ignition: point.ignition,
                    public_ip_address: point.public_ip_address,
                    geofence_id: point.geofence_id,
                    route_id: point.route_id,
                    geofence_violation_state: point.geofence_violation_state,
                    is_engine_locked: point.is_engine_locked || false,
                    ccid: point.ccid,
                    imei: point.imei,
                    imsi: point.imsi
                }
            });
        }

        // Find the newest point by timestamp
        const newestPoint = dataPoints.reduce((max, point) => {
            const pointTime = new Date(point.time_from);
            const maxTime = new Date(max.time_from);
            return pointTime > maxTime ? point : max;
        });

        // Get current vehicle state
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: first.vehicle_id }
        });

        if (!vehicle) {
            setResponseStatus(event, 404);
            return { success: false, message: "Vehicle not found" };
        }

        // Update vehicle.last_seen only if new data is newer than current
        const newestTime = new Date(newestPoint.time_from);
        const shouldUpdate = !vehicle.last_seen || newestTime > vehicle.last_seen;

        if (shouldUpdate) {
            await prisma.vehicle.update({
                where: { id: first.vehicle_id },
                data: {
                    last_seen: newestTime
                }
            });
        }

        setResponseStatus(event, 200);
        return {
            success: true,
            message: `Saved ${dataPoints.length} point(s)`,
            updated_vehicle: shouldUpdate
        };

    } catch (error) {
        console.error("Tracking data error:", error);
        setResponseStatus(event, 500);
        return { success: false, message: "Internal server error", error: String(error) };
    }
});
