import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';
import moment from "moment";
import xlsx from "json-as-xlsx";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // Validate input
        const bodySchema = z.object({
            vehicle_id: z.string().cuid(),
            date_from: z.string().datetime(),
            date_to: z.string().datetime(),
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex),
            export_option: z.string().optional()
        });

        // Destruct body
        const { vehicle_id, date_from, date_to, user_id, token, export_option } = body;

        const validateBody = bodySchema.safeParse(body);

        //Get env variables
        //Get env variables
        const config = useRuntimeConfig();
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateBody.success) return { data: [], message: 'Input is in the wrong format', success: false }

        if (!validateToken.success) return { data: [], message: 'Session is invalid', success: false }

        // Get company ID from the User's data
        const user = await prisma.user.findUnique({
            where: {
                id: user_id
            }
        })

        const company_id = user.company_where_user_is_admin_id

        // Check if this user has access to this endpoint
        if (!await prisma.vehicle.count({
            where: {
                AND: [
                    { id: vehicle_id },
                    { user: { some: { id: user_id } } }
                ]
            }
        }) && !await isAllowedOnEndpoint('COMPANY_ADMIN', company_id, user_id) && !await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { data: [], message: 'User does not have permission', success: false }

        // Get data
        // Get data
        const getTrackingData = await prisma.trackingData.findMany({
            where: {
                AND: [
                    {
                        vehicle: {
                            id: vehicle_id
                        }
                    },
                    {
                        OR: [
                            {
                                AND: [
                                    { time_from: { gt: new Date(date_from) } },
                                    { time_from: { lte: new Date(date_to) } }
                                ]
                            },
                            {
                                AND: [
                                    { time_to: { gt: new Date(date_from) } },
                                    { time_to: { lte: new Date(date_to) } }
                                ]
                            }
                        ]
                    }
                ]
            },
            orderBy: {
                time_to: 'asc' // Sort for distance calculation
            }
        })

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

        // Process data to calculate cumulative mileage
        // Find start mileage
        let cumulativeMileage = 0;
        // Try to find the first non-zero mileage to anchor
        for (const t of getTrackingData) {
            if (t.mileage && t.mileage > 0) {
                 cumulativeMileage = t.mileage / 1000; // Convert to KM immediately for consistency
                 break;
            }
        }

        const processedData = getTrackingData.map((t, index) => {
            // If current record has valid DB mileage, update anchor
            if (t.mileage && t.mileage > 0) {
                 cumulativeMileage = t.mileage / 1000; // DB is in meters, convert to KM
            } else {
                 // No DB mileage - calculate distance from previous point
                 if (index > 0) {
                     const prev = getTrackingData[index - 1];
                     if (prev.lat && prev.lon && t.lat && t.lon) {
                         const distance = haversineDistance(prev.lat, prev.lon, t.lat, t.lon);
                         cumulativeMileage += distance;
                     }
                 }
            }
            
            return {
                ...t,
                mileage_calculated_km: cumulativeMileage
            };
        });

        // Define all available columns
        const allColumns = [
            { label: "Altitude (m)", value: "altitude" },
            { label: "Course", value: "course" },
            { label: "Speed (km/h)", value: "speed" },
            { label: "Fuel Level (L)", value: "fuel_level" },
            { label: "Mileage (km)", value: (row) => row.mileage_calculated_km ? row.mileage_calculated_km.toFixed(2) : '0.00' },
            // { label: "Mileage (m)", value: "mileage" }, // Removed as requested
            { label: "Ignition Status", value: (row) => row?.ignition ? 'ON' : 'OFF' },
            { label: "HDOP", value: "hdop" },
            { label: "Battery Percentage (%)", value: "battery_percentage" },
            { label: "Satellites", value: "satellites" },
            { label: "Latitude", value: "lat" },
            { label: "Longitude", value: "lon" },
            { label: "Age", value: "age" },
            { label: "Time From", value: (row) => moment(new Date(row.time_from)).format('ddd, DD MMM yy, h:mmA') },
            { label: "Time To", value: (row) => moment(new Date(row.time_to)).format('ddd, DD MMM yy, h:mmA') },
            { label: "State", value: "state" },
            { label: "Geofence Violation State", value: "geofence_violation_state" },
            { label: "Operator Name", value: "operator_name" },
            { label: "Network IP Address", value: "ip_address" },
            { label: "Publick IP Address", value: "public_ip_address" },
            { label: "Signal Strength", value: "signal_strength" },
            { label: "CCID", value: "ccid" },
            { label: "IMEI", value: "imei" },
            { label: "IMSI", value: "imsi" }
        ];

        // Filter columns based on export_option
        let columnsToExport = allColumns;

        if (export_option && export_option !== 'All' && export_option !== 'Complete Data') {
            const baseColumns = ['Time From', 'Time To', 'Latitude', 'Longitude'];

            const optionMap: Record<string, string> = {
                'Fuel Level': 'Fuel Level (L)',
                'Speed': 'Speed (km/h)',
                'Mileage': 'Mileage (km)',
                'Battery Percentage': 'Battery Percentage (%)',
                'Ignition Status': 'Ignition Status'
            };

            const targetLabel = optionMap[export_option];

            if (targetLabel) {
                columnsToExport = allColumns.filter(col =>
                    baseColumns.includes(col.label) || col.label === targetLabel
                );
            }
        }

        // Convert json into CSV
        let data = [
            {
                sheet: "Tracking Data",
                columns: columnsToExport,
                content: processedData // Use processed data
            }
        ]

        let settings: any = {
            fileName: "Tracking Data", // Name of the resulting spreadsheet
            extraLength: 3, // A bigger number means that columns will be wider
            writeMode: "write", // The available parameters are 'WriteFile' and 'write'. This setting is optional. Useful in such cases https://docs.sheetjs.com/docs/solutions/output#example-remote-file
            writeOptions: {
                type: "buffer"
            }
        }

        return xlsx(data, settings);
    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);

        return {
            data: [],
            message: "Server Error. Please try again later",
            success: false
        }
    }
})