
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { type TrackingData } from "@prisma/client";
import Joi from "@xavisoft/joi";

export default defineEventHandler(async (event) => {
    try {

        // auth
        const number_plate: string = event.context.vehicle?.number_plate;

        if (!number_plate) {
            setResponseStatus(event, 401)
            return { data: {}, message: "Unauthorized", success: false }
        }

        // Validate input
        const body = await readBody(event);

        const schema = {
            is_engine_locked: Joi.boolean().required(),
            ip_address: Joi.string().ip().allow(''),
            signal_quality: Joi.number().required(),
            modem_name: Joi.string().required(),
            modem_info: Joi.string().required(),
            ccid: Joi.string().allow('').required(),
            imei: Joi.string().allow('').required(),
            imsi: Joi.string().allow('').required(),
            operator_name: Joi.string().allow('').required(),
            data: Joi.array().items(Joi.object({
                geofence_id: Joi.string().allow('').required(),
                geofence_violation_state: Joi.string().allow('').required(),
                satellites: Joi.number().required(),
                hdop: Joi.number().required(),
                lat: Joi.number().required(),
                lon: Joi.number().required(),
                age: Joi.number().required(),
                time_from: Joi.date().required(),
                time_to: Joi.date().required(),
                altitude: Joi.number().required(),
                course: Joi.number().required(),
                speed: Joi.number().required(),
                fuel_level: Joi.number().required(),
                ignition: Joi.boolean().required(),
                battery_percentage: Joi.number().required(),
                state: Joi.string().allow('').required()
            })).required()
        }

        const error = Joi.getError(body, schema);
        if (error) {
            setResponseStatus(event, 400)
            return { data: {}, message: error, success: false }
        }

        // Destruct body
        let { data, is_engine_locked, ip_address, signal_quality, modem_name, modem_info, ccid, imei, imsi, operator_name } = body;

        // Filter variable values
        ip_address = z.string().ip().safeParse(ip_address).success ? ip_address : ""
        ccid = (/\w+/g).test(ccid) ? ccid : null
        imei = !isNaN(imei) ? imei : null
        imsi = !isNaN(imsi) ? imsi : null

        // Filter Operator Name
        operator_name = (/^\d+$/g).test(operator_name) ? '' : operator_name

        // Get Public IP Address
        const public_ip_address = event.headers.get('x-forwarded-for')

        // Check if vehicle exists
        const vehicle = await prisma.vehicle.findUnique({
            where: {
                number_plate: number_plate?.toUpperCase()
            },
            include: {
                user: {
                    select: {
                        id: true
                    }
                },
                route: true,
                geofence: true
            }
        });

        if(!vehicle) {
            setResponseStatus(event, 400)

            return { data: {}, message: "Vehicle not found", success: false }
        }

        if (data.length === 0) {
            return {
                data: {},
                message: "",
                success: true
            }
        }

        const trackingDataSimilarAcrossAllEntries = {
            is_engine_locked,
            ip_address,
            public_ip_address,
            imei,
            imsi,
            operator_name,
            ccid,
        }

        // TODO: Refactor this to use a transaction

        for (let index = 0; index < data.length; index++) {

            const { geofence_id, geofence_violation_state, satellites, hdop, lat, lon, age, altitude, course, speed, fuel_level, ignition, battery_percentage, state }: TrackingData = data[index];
            
            let { time_from, time_to } = data[index];
            time_from = new Date(time_from);
            time_to = new Date(time_to);

            const trackingDataSimilarAcrossThisEntry = {
                ...trackingDataSimilarAcrossAllEntries,
                geofence_violation_state,
                satellites,
                hdop,
                lat,
                lon,
                age,
                time_from,
                time_to,
                altitude,
                course,
                speed,
                fuel_level,
                ignition,
                battery_percentage,
                state,
                signal_strength: signal_quality,
                vehicle_id: vehicle.id
            }

            if (geofence_id !== "null" && geofence_violation_state === 'VIOLATION') {
                if (vehicle.route) {
                    trackingDataSimilarAcrossThisEntry['route_id'] = vehicle.route.id;
                } else if (vehicle.geofence?.id === geofence_id) {
                    trackingDataSimilarAcrossThisEntry['geofence_id'] = geofence_id;
                }
            }

            let trackingDataRecord: TrackingData;

            // Get the first element of data
            if (index === 0) {
                // Get the last entered tracking data
                const [ tracking_data ] = await prisma.trackingData.findMany({
                    where: {
                        vehicle: {
                            number_plate
                        }
                    },
                    take: 1,
                    orderBy: {
                        created_at: "desc"
                    }
                });

                // If the distance is less than or equal to 15m then its then merge the two coordinates
                if (tracking_data && cosineDistanceBetweenPoints(tracking_data.lat, tracking_data.lon, lat, lon) <= 15) {
                    // Update previous tracking data with the new tracking data
                    trackingDataRecord = await prisma.trackingData.update({
                        where: { id: tracking_data.id },
                        data: trackingDataSimilarAcrossThisEntry,
                    });
                
                } 
            } 

            if (!trackingDataRecord) {
                trackingDataRecord = await prisma.trackingData.create({
                    data: trackingDataSimilarAcrossThisEntry,
                });
            }

        }

        // update vehicle last seen
        await prisma.vehicle.update({
            where: {
                number_plate
            },
            data: {
                modem_name,
                modem_info,
                last_seen: new Date(),
            }
        });
        
        // TODO: figure out the role of is_geofence_violation_email_sent

        return {
            data: {},
            message: "",
            success: true
        }
        
    } catch(error) {
        console.error(error)
        
        setResponseStatus(event, 500)

        return {
            data: {},
            message: error.message,
            success: false
        }
    }
})

const cosineDistanceBetweenPoints = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const deltaP = p2 - p1;
    const deltaLon = lon2 - lon1;
    const deltaLambda = (deltaLon * Math.PI) / 180;
    const a = Math.sin(deltaP/2) * Math.sin(deltaP/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R;
    return d;
  }