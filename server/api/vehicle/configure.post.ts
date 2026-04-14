
import Joi from "@xavisoft/joi";
import { prisma } from "~/prisma/db";
import { createLog } from "~/vendors/logs";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // Validation schema for device configuration
        const schema = {
            vehicle_id: Joi.string().required(),
            // Optional configuration fields
            speed_limit: Joi.number().optional().allow(null, ''),
            fuel_calibration: Joi.any().optional(), // Can be text or json
            installer_name: Joi.string().optional().allow(null, ''),
            company_name: Joi.string().optional().allow(null, ''),
            installation_date: Joi.string().optional().allow(null, ''),

            // APN 1
            apn_1: Joi.string().optional().allow(null, ''),
            apn_user_1: Joi.string().optional().allow(null, ''),
            apn_password_1: Joi.string().optional().allow(null, ''),

            // APN 2
            apn_2: Joi.string().optional().allow(null, ''),
            apn_user_2: Joi.string().optional().allow(null, ''),
            apn_password_2: Joi.string().optional().allow(null, ''),

            // General
            phone_number: Joi.string().optional().allow(null, ''),
            config: Joi.string().optional().allow(null, '') // Generic text area
        };

        const error = Joi.getError(body, schema);
        if (error) {
            setResponseStatus(event, 400);
            return { data: {}, message: error, success: false };
        }

        const {
            vehicle_id,
            phone_number,
            ...configuration
        } = body;

        // Check Access
        if (!event.context.user) {
            setResponseStatus(event, 401);
            return { data: {}, message: "Unauthorized", success: false };
        }

        // Verify vehicle exists
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicle_id }
        });

        if (!vehicle) {
            setResponseStatus(event, 404);
            return { data: {}, message: "Vehicle not found", success: false };
        }

        // Update Vehicle Configuration
        const updatedVehicle = await prisma.vehicle.update({
            where: { id: vehicle_id },
            data: {
                configuration: configuration, // Store the settings JSON
                tracker_sim_phone: phone_number || vehicle.tracker_sim_phone // Update phone if provided
            }
        });

        // Create Command for Device
        await prisma.controllerCommand.create({
            data: {
                vehicle_id: vehicle_id,
                code: 'CONFIGURE_DEVICE',
                payload: configuration,
                user_id: event.context.user.id
            }
        });

        // Log Action
        await createLog(
            event.context.user.id,
            "Configured Device",
            "Vehicle",
            `Updated configuration for vehicle ${vehicle.number_plate}`
        );

        return {
            data: updatedVehicle,
            message: "Configuration saved and command sent to device.",
            success: true
        };

    } catch (e: any) {
        console.error(e);
        setResponseStatus(event, 500);
        return { data: {}, message: "Internal Server Error: " + e.message, success: false };
    }
});
