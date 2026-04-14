import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // --- DEBUG LOGGING ---
        console.log('--- INCOMING TRACKER DATA ---');
        console.log('Headers:', getHeaders(event));
        console.log('Body:', JSON.stringify(body, null, 2));
        // ---------------------

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

        let latestBatteryValue = null;

        // Save all points to TrackingData history
        for (const point of dataPoints) {
            // === GPS VALIDATION & DEDUPLICATION ===
            // Import validation functions
            const { isValidGPSCoordinate, isReasonableJump } = await import('~/utils/gps-validation');

            const pointTime = new Date(point.time_from);

            // 1. DEDUPLICATION: Skip if this exact point already exists
            const existingPoint = await prisma.trackingData.findFirst({
                where: {
                    vehicle_id: point.vehicle_id,
                    lat: point.lat,
                    lon: point.lon,
                    time_from: pointTime
                },
                select: { id: true }
            });

            if (existingPoint) {
                console.log('ℹ️ Skipping duplicate point:', {
                    vehicle_id: point.vehicle_id,
                    time_from: point.time_from
                });
                continue;
            }

            // 2. GPS VALIDATION: Validate coordinates
            if (!isValidGPSCoordinate(point.lat, point.lon)) {
                console.warn('⚠️ Rejected invalid GPS coordinate:', {
                    vehicle_id: point.vehicle_id,
                    lat: point.lat,
                    lon: point.lon,
                    reason: point.lat === 0 && point.lon === 0 ? 'Null Island (0,0)' : 'Out of valid range',
                    time_from: point.time_from
                });
                continue;
            }

            // 3. FIND PREVIOUS POINT: Find the point immediately *before* this one in time
            const lastValidPoint = await prisma.trackingData.findFirst({
                where: { 
                    vehicle_id: point.vehicle_id,
                    time_from: { lt: pointTime } 
                },
                orderBy: { time_from: 'desc' },
                select: { lat: true, lon: true, mileage: true, time_to: true }
            });

            // 4. JUMP VALIDATION: Check for extreme jumps relative to chronological predecessor
            if (lastValidPoint && lastValidPoint.lat && lastValidPoint.lon) {
                const isReasonable = isReasonableJump(
                    {
                        lat: lastValidPoint.lat,
                        lon: lastValidPoint.lon,
                        time: lastValidPoint.time_to
                    },
                    {
                        lat: point.lat,
                        lon: point.lon,
                        time: pointTime
                    },
                    200 // Max 200 km/h
                );

                if (!isReasonable) {
                    console.warn('⚠️ Rejected unreasonable GPS jump:', {
                        vehicle_id: point.vehicle_id,
                        from: { lat: lastValidPoint.lat, lon: lastValidPoint.lon },
                        to: { lat: point.lat, lon: point.lon },
                        reason: 'Extreme jump relative to predecessor',
                        time_from: point.time_from
                    });
                    continue; // Skip this point
                }
            }
            // === END GPS VALIDATION ===

            // --- MILEAGE CALCULATION ---
            // Try alternative mileage field names
            let mileageValue = point.mileage || point.odometer || point.odo || point.total_mileage || point.distance;

            // If no mileage from device, calculate from GPS coordinates RELATIVE TO CHRONOLOGICAL PREDECESSOR
            if (!mileageValue) {
                if (lastValidPoint && lastValidPoint.lat && lastValidPoint.lon) {
                    const { haversineDistance } = await import('~/utils/haversine');
                    const distance = haversineDistance(
                        lastValidPoint.lat,
                        lastValidPoint.lon,
                        point.lat,
                        point.lon
                    );

                    if (distance >= 0.01) {
                        mileageValue = (lastValidPoint.mileage || 0) + distance;
                    } else {
                        mileageValue = lastValidPoint.mileage || 0;
                    }
                } else {
                    mileageValue = 0;
                }
            }

            // Capture external battery voltage from various possible fields
            const externalBatteryValue = point.external_battery_voltage || point.ext_battery || point.car_battery || point.vehicle_battery || point.vbatt;
            if (externalBatteryValue !== undefined && externalBatteryValue !== null) {
                latestBatteryValue = externalBatteryValue;
            }

            await prisma.trackingData.create({
                data: {
                    vehicle_id: point.vehicle_id,
                    lat: point.lat,
                    lon: point.lon,
                    speed: point.speed || 0,
                    time_from: pointTime,
                    time_to: new Date(point.time_to || point.time_from),
                    altitude: point.altitude || 0,
                    course: point.course || 0,
                    hdop: point.hdop || 0,
                    signal_strength: point.signal_strength || 0,
                    satellites: point.satellites || 0,
                    ip_address: point.ip_address || "unknown",
                    state: (point.state === 'MOVING' || point.state === 'STATIONARY') ? point.state : ((point.speed || 0) > 0 ? 'MOVING' : 'STATIONARY'),
                    age: point.age || 0,
                    battery_percentage: point.battery_percentage,
                    fuel_level: point.fuel_level,
                    mileage: mileageValue,
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

        // Update vehicle state (last_seen and configuration for battery)
        const newestTime = new Date(newestPoint.time_from);
        
        // --- ACCURACY CHECK ---
        // We only move the "Current Location" (last_seen) if the point has a valid GPS fix.
        // LBS (Cell Tower) data usually has 0 satellites and is used when GPS is lost.
        // Skipping LBS for last_seen prevents the marker from "jumping" when stationary.
        const isHighAccuracy = (newestPoint.satellites > 0) || (newestPoint.hdop > 0 && newestPoint.hdop < 10);
        
        const shouldUpdateLastSeen = (!vehicle.last_seen || newestTime > vehicle.last_seen) && isHighAccuracy;

        if (shouldUpdateLastSeen || latestBatteryValue !== null) {
            const updateData: any = {};
            if (shouldUpdateLastSeen) updateData.last_seen = newestTime;

            if (latestBatteryValue !== null) {
                const config = (vehicle.configuration as any) || {};
                config.external_battery_voltage = latestBatteryValue;
                updateData.configuration = config;
            }

            await prisma.vehicle.update({
                where: { id: first.vehicle_id },
                data: updateData
            });
        }

        setResponseStatus(event, 200);
        return {
            success: true,
            message: `Saved ${dataPoints.length} point(s)`,
            updated_vehicle: shouldUpdateLastSeen || latestBatteryValue !== null
        };

    } catch (error) {
        console.error("Tracking data error:", error);
        setResponseStatus(event, 500);
        return { success: false, message: "Internal server error", error: String(error) };
    }
});
