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
            token: z.string().regex(jwt_regex)
        });

        // Destruct body
        const { vehicle_id, date_from, date_to, user_id, token } = body;

        const validateBody = bodySchema.safeParse(body);
        
        //Get env variables
        const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if(!validateBody.success) return { data: [], message: 'Input is in the wrong format', success: false }

        if(!validateToken.success) return { data: [], message: 'Session is invalid', success: false }

        // Get company ID from the User's data
        const user = await prisma.user.findUnique({
            where: {
                id: user_id
            }
        })

        const company_id = user.company_where_user_is_admin_id

        // Check if this user has access to this endpoint
        if(!await prisma.vehicle.count({ where: {
            AND: [
                { id: vehicle_id },
                { user: { some: { id: user_id } } }
            ]
        }}) && !await isAllowedOnEndpoint('COMPANY_ADMIN', company_id, user_id) && !await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { data: [], message: 'User does not have permission', success: false }

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
                                    {
                                        time_from: {
                                            gt: new Date(date_from)
                                        }
                                    },
                                    {
                                        time_from: {
                                            lte: new Date(date_to)
                                        }
                                    }
                                ]
                            },
                            {
                                AND: [
                                    {
                                        time_to: {
                                            gt: new Date(date_from)
                                        }
                                    },
                                    {
                                        time_to: {
                                            lte: new Date(date_to)
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        })

        // Convert json into CSV
        let data = [
            {
                sheet: "Tracking Data",
                columns: [
                    { label: "Altitude (m)", value: "altitude" },
                    { label: "Course", value: "course" },
                    { label: "Speed (km/h)", value: "speed" },
                    { label: "Fuel Level (L)", value: "fuel_level" },
                    { label: "Mileage (m)", value: "mileage" },
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
                    { label: "Geofence Violation State", value: "geofence_violation_state"},
                    { label: "Operator Name", value: "operator_name" },
                    { label: "Network IP Address", value: "ip_address" },
                    { label: "Publick IP Address", value: "public_ip_address" },
                    { label: "Signal Strength", value: "signal_strength" },
                    { label: "CCID", value: "ccid" },
                    { label: "IMEI", value: "imei" },
                    { label: "IMSI", value: "imsi" }
                ],
                content: [
                    ...getTrackingData
                ]
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