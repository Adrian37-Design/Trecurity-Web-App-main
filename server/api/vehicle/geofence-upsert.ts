
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';
import { createLog } from "~/vendors/logs";
import Joi from "@xavisoft/joi";
import { ApprovalLevel } from "@prisma/client";
import { set } from "~/public/libs/bootstrap/js/dist/dom/data";

export default defineEventHandler(async (event) => {

    // TODO: Break this into three separate endpoints

    try {

        // auth
        const user_id = event.context.user?.id;
        if (!user_id) {
            setResponseStatus(event, 401);
            return;
        }

        // Validate input
        const body = await readBody(event);

        const schema = Joi
            .object({
                vehicle_id: Joi.string().required(),
                geometry: Joi.array().items({
                    lat: Joi.number().required(),
                    lng: Joi.number().required(),
                }).min(3),
                route_id: Joi.string(),
                code: Joi.valid('create', 'edit', 'delete').required(),
            })
            .when('.code', {
                is: 'delete',
                then: Joi.object({
                    geometry: Joi.forbidden(),
                    route_id: Joi.forbidden(),
                }),
                otherwise: Joi.object().xor('geometry', 'route_id')
            });

        const error = Joi.getError(body, schema);
        if (error) {
            setResponseStatus(event, 400);
            return {
                message: error
            }
        }

        // Get company ID from the User's data
        const user = await prisma.user.findUnique({
            where: {
                id: user_id
            }
        })

        const company_id = user.company_where_user_is_admin_id

        // Check if this user has access to this endpoint
        const { vehicle_id } = body;

        if (!await prisma.vehicle.count({
            where: {
                AND: [
                    { id: vehicle_id },
                    { user: { some: { id: user_id } } }
                ]
            }
        }) && !await isAllowedOnEndpoint(ApprovalLevel.COMPANY_ADMIN, company_id, user_id) && !await isAllowedOnEndpoint(ApprovalLevel.SUPER_ADMIN, null, user_id)) return { data: {}, message: 'User does not have permission', success: false }

        // save data
        await prisma.$transaction(async () => {

            // define functions
            const deleteGeofence = () => {
                return prisma.geofence.deleteMany({
                    where: {
                        vehicle: {
                            some: {
                                id: vehicle_id
                            }
                        }
                    }
                });
            }

            const setRoute = async (route_id: string | null) => {
                const { route } = await prisma.vehicle.update({
                    where: {
                        id: vehicle_id
                    },
                    data: {
                        route_id
                    },
                    include: {
                        route: true
                    }
                });

                if (!route)
                    return null;

                return {
                    id: route.id,
                    geofence: route.bounds
                }
            }

            // get vehicle
            const vehicle = await prisma.vehicle.findUnique({
                where: {
                    id: vehicle_id
                },
                include: {
                    geofence: true,
                    route: true
                }
            });

            // update geofence
            const { route_id, geometry, code } = body;
            let geofence = null;

            switch (code) {
                case 'create':

                    // Delete all geofences (which technically is should be one I think) for this vehicle
                    // BEcause in either case, the old one won't be used
                    await deleteGeofence();

                    if (route_id) {
                        geofence = await setRoute(route_id);
                    } else {
                        geofence = await prisma.geofence.create({
                            data: {
                                geometry,
                                vehicle: {
                                    connect: {
                                        id: vehicle_id
                                    }
                                }
                            }
                        });
                    }

                    break;

                case 'edit':

                    if (route_id) {
                        // delete geofence then set route
                        await deleteGeofence();
                        geofence = await setRoute(route_id);
                    } else {
                        // unset route and update/create geofence
                        /// unset route
                        await setRoute(null);

                        /// update geofence
                        const geofenceId = vehicle.geofence?.id;

                        if (geofenceId) {
                            geofence = await prisma.geofence.update({
                                where: {
                                    id: geofenceId
                                },
                                data: {
                                    geometry
                                }
                            });
                        } else {
                            geofence = await prisma.geofence.create({
                                data: {
                                    geometry,
                                    vehicle: {
                                        connect: {
                                            id: vehicle_id
                                        }
                                    }
                                }
                            });
                        }
                    }

                    break;

                case 'delete':
                    // delete geofence and unset route
                    await deleteGeofence();
                    await setRoute(null);

                    geofence = {};

                    break;

                default:
                    throw new Error('Invalid code');

            }

            if (!geofence)
                throw new Error('Geofence not found'); // defensive programming

            // add geofence command
            await prisma.controllerCommand.create({
                data: {
                    code: code === 'create' ? 'CREATE_GEOFENCE' : code === 'edit' ? 'UPDATE_GEOFENCE' : 'DELETE_GEOFENCE',
                    payload: {
                        geofence,
                        lock_engine_on_geofence_violation: vehicle.lock_engine_on_geofence_violation
                    },
                    vehicle: {
                        connect: {
                            id: vehicle_id
                        }
                    },
                    user: {
                        connect: {
                            id: user_id
                        }
                    }
                }
            });


            // save action
            createLog(code === 'create' ? 'Create Geofence' : code === 'edit' ? 'Update Geofence' : 'Delete Geofence', user_id, 'Command', `Vehicle ${vehicle.number_plate} (${vehicle.id})`);

        });

        return {
            data: {},
            message: "",
            success: true
        }

    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);

        return {
            data: {},
            message: "Server Error. Please try again later",
            success: false
        }
    }
});

