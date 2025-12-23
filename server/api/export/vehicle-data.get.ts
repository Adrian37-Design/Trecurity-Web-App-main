import { prisma } from '~/prisma/db';
import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { z } from "zod";

export default defineEventHandler(async (event) => {
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
            setResponseStatus(event, 400);
            return { success: false, message: 'Invalid parameters' };
        }

        const { vehicle_id, user_id, token } = validation.data;

        // Validate JWT token
        const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateToken.success) {
            setResponseStatus(event, 401);
            return { success: false, message: 'Invalid session' };
        }

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
            setResponseStatus(event, 404);
            return { success: false, message: 'Vehicle not found' };
        }

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

        // Dynamically import xlsx to avoid ESM loader issues on Windows
        const XLSX = await import('xlsx');

        // Create workbook
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
            'State',
            'Ignition',
            'Battery %',
            'Fuel %',
            'Satellites',
            'Signal Strength',
            'Operator'
        ];

        const trackingData = vehicle.tracking_data.map(t => [
            new Date(t.time_to).toLocaleString(),
            t.lat,
            t.lon,
            t.speed,
            t.altitude,
            t.course,
            t.state,
            t.ignition ? 'On' : 'Off',
            t.battery_percentage || 'N/A',
            t.fuel_level || 'N/A',
            t.satellites,
            t.signal_strength,
            t.operator_name || 'N/A'
        ]);

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

        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set response headers
        setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        setHeader(event, 'Content-Disposition', `attachment; filename="${vehicle.number_plate.replace(/[^a-zA-Z0-9]/g, '_')}_data.xlsx"`);

        return buffer;

    } catch (error) {
        console.error('Export error:', error);
        setResponseStatus(event, 500);
        return { success: false, message: 'Export failed' };
    }
});
