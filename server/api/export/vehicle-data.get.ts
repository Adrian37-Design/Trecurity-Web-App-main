import { prisma } from '~/prisma/db';
import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { z } from "zod";
import * as XLSX from 'xlsx';

export default defineEventHandler(async (event) => {
    console.log("DEBUG_EXPORT: Request started");
    try {
        const query = getQuery(event);

        // Validate query parameters
        const querySchema = z.object({
            vehicle_id: z.string().cuid(),
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        const validation = querySchema.safeParse(query);

        if (!validation.success) {
            console.log("DEBUG_EXPORT: Invalid Params", validation.error);
            setResponseStatus(event, 400);
            return { success: false, message: 'Invalid parameters' };
        }

        const { vehicle_id, user_id, token } = validation.data;
        console.log("DEBUG_EXPORT: Params Validated for vehicle", vehicle_id, "user", user_id);

        // Validate JWT token
        const config = useRuntimeConfig();
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateToken.success) {
            console.log("DEBUG_EXPORT: Auth Failed");
            setResponseStatus(event, 401);
            return { success: false, message: 'Invalid session' };
        }
        console.log("DEBUG_EXPORT: Auth Success");

        // Fetch vehicle data with all related information
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicle_id },
            include: {
                tracking_data: {
                    orderBy: { time_to: 'desc' },
                    take: 10000 // Limit to 10,000 most recent records
                },
                controller_command: {
                    orderBy: { created_at: 'desc' }
                },
                geofence: true,
                company: true,
                user: {
                    select: {
                        email: true,
                        first_name: true,
                        last_name: true
                    }
                }
            }
        });

        if (!vehicle) {
            console.log("DEBUG_EXPORT: Vehicle Not Found");
            setResponseStatus(event, 404);
            return { success: false, message: 'Vehicle not found' };
        }
        console.log("DEBUG_EXPORT: Vehicle Found", vehicle.number_plate);

        // Helper function to estimate battery voltage
        const estimateBatteryVoltage = (percentage: number | null): string => {
            if (!percentage || percentage < 0) return '0.0V';
            const voltage = 11.8 + (percentage / 100) * 0.8;
            return voltage.toFixed(1) + 'V';
        };

        // Helper function for GPS status
        const getGPSStatus = (satellites: number | null): string => {
            if (!satellites) return 'Unknown';
            return satellites >= 4 ? 'Good' : 'No GPS';
        };

        // Helper function to calculate distance between two GPS coordinates
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
        };

        // Static import used
        const workbook = XLSX.utils.book_new();

        // ====================
        // Sheet 1: Vehicle Information
        // ====================
        const latestTracking = vehicle.tracking_data[0];

        const vehicleInfo = [
            ['Number Plate', vehicle.number_plate],
            ['Type', vehicle.type],
            ['Company', vehicle.company.name],
            ['Status', vehicle.status ? 'Active' : 'Inactive'],
            ['Last Seen', vehicle.last_seen ? new Date(vehicle.last_seen).toLocaleString() : 'Never'],
            ['Battery Percentage', latestTracking?.battery_percentage ? latestTracking.battery_percentage + '%' : 'N/A'],
            ['Battery Voltage', estimateBatteryVoltage(latestTracking?.battery_percentage)],
            ['GPS Status', getGPSStatus(latestTracking?.satellites)],
            ['Satellites', latestTracking?.satellites || 'N/A'],
            ['Signal Strength', latestTracking?.signal_strength ? latestTracking.signal_strength + '/30' : 'N/A'],
            ['Operator', latestTracking?.operator_name || 'N/A']
        ];

        const vehicleSheet = XLSX.utils.aoa_to_sheet(vehicleInfo);
        XLSX.utils.book_append_sheet(workbook, vehicleSheet, 'Vehicle Info');

        // ====================
        // Sheet 2: Tracking History
        // ====================
        const trackingHeaders = [
            'Timestamp',
            'Latitude',
            'Longitude',
            'Speed (km/h)',
            'Altitude (m)',
            'Course (°)',
            'Mileage (km)',
            'Mileage (m)',
            'State',
            'Ignition',
            'Battery %',
            'Fuel %',
            'Satellites',
            'Signal Strength',
            'Operator'
        ];

        // Calculate cumulative mileage from GPS coordinates
        // Reverse the array to process from oldest to newest
        const reversedTrackingData = [...vehicle.tracking_data].reverse();

        // Find the last (oldest) known database mileage to start from
        let cumulativeMileage = 0;
        for (let i = 0; i < reversedTrackingData.length; i++) {
            if (reversedTrackingData[i].mileage) {
                cumulativeMileage = reversedTrackingData[i].mileage;
                break;
            }
        }

        const trackingData = reversedTrackingData.map((t, index) => {
            // If current record has DB mileage, use it and sync our cumulative counter
            if (t.mileage) {
                cumulativeMileage = t.mileage;
            } else {
                // No DB mileage - calculate distance from previous point
                if (index > 0) {
                    const prev = reversedTrackingData[index - 1];
                    if (prev.lat && prev.lon && t.lat && t.lon) {
                        const distance = haversineDistance(prev.lat, prev.lon, t.lat, t.lon);
                        cumulativeMileage += distance;
                    }
                }
            }

            const mileageKm = cumulativeMileage;
            const mileageM = mileageKm ? (mileageKm * 1000).toFixed(0) : 'N/A';

            return [
                new Date(t.time_to).toLocaleString(),
                t.lat,
                t.lon,
                t.speed,
                t.altitude,
                t.course,
                mileageKm ? mileageKm.toFixed(2) : 'N/A',
                mileageM,
                t.state,
                t.ignition ? 'On' : 'Off',
                t.battery_percentage || 'N/A',
                t.fuel_level || 'N/A',
                t.satellites,
                t.signal_strength,
                t.operator_name || 'N/A'
            ];
        }).reverse(); // Reverse back to newest first

        const trackingSheet = XLSX.utils.aoa_to_sheet([trackingHeaders, ...trackingData]);
        XLSX.utils.book_append_sheet(workbook, trackingSheet, 'Tracking History');

        // ====================
        // Sheet 3: Commands History
        // ====================
        if (vehicle.controller_command.length > 0) {
            const commandHeaders = [
                'Command',
                'Created At',
                'Executed',
                'Executed At'
            ];

            const commandData = vehicle.controller_command.map(c => [
                c.code.replace('_', ' '),
                new Date(c.created_at).toLocaleString(),
                c.is_executed ? 'Yes' : 'No',
                c.updated_at && c.is_executed ? new Date(c.updated_at).toLocaleString() : 'N/A'
            ]);

            const commandSheet = XLSX.utils.aoa_to_sheet([commandHeaders, ...commandData]);
            XLSX.utils.book_append_sheet(workbook, commandSheet, 'Commands History');
        }

        // ====================
        // Sheet 4: Geofence
        // ====================
        if (vehicle.geofence) {
            const geofenceInfo = [
                ['Name', vehicle.geofence.name],
                ['Type', vehicle.geofence.geofence_violation_type],
                ['Lock Engine on Violation', vehicle.lock_engine_on_geofence_violation ? 'Yes' : 'No'],
                ['Coordinates', JSON.parse(vehicle.geofence.coordinates).map((c: number[]) => `${c[0]}, ${c[1]}`).join('; ')]
            ];

            const geofenceSheet = XLSX.utils.aoa_to_sheet(geofenceInfo);
            XLSX.utils.book_append_sheet(workbook, geofenceSheet, 'Geofence');
        }

        console.log("DEBUG_EXPORT: Writing Workbook");
        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        console.log("DEBUG_EXPORT: Buffer Generated, size:", buffer.length); // log buffer size requires accessing length property on buffer which is supported

        // Set response headers
        setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        setHeader(event, 'Content-Disposition', `attachment; filename="${vehicle.number_plate.replace(/[^a-zA-Z0-9]/g, '_')}_data.xlsx"`);

        return buffer;

    } catch (error) {
        console.error('DEBUG_EXPORT: Export error:', error);
        setResponseStatus(event, 500);
        return { success: false, message: 'Export failed' };
    }
});
