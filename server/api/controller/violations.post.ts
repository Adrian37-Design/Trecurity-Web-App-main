
import { ViolationType } from "@prisma/client";
import Joi from "@xavisoft/joi";
import { prisma } from "~/prisma/db";
import { sendGeofenceViolationEmail } from "~/vendors/mail";

export default defineEventHandler(async (event) => {
  
  // auth
  const number_plate: string = event.context.vehicle?.number_plate;

  if (!number_plate) {
    setResponseStatus(event, 401)
    return { data: {}, message: "Unauthorized", success: false }
  }

  // validate body
  const body = await readBody(event);

  const schema = {
    violations: Joi.array().items({
      type: Joi.valid(...Object.values(ViolationType)).required(),
      data: Joi.object({
        lat: Joi.number().required(),
        lon: Joi.number().required(),
        speed: Joi.number().required(),
        satellites: Joi.number().integer().required(),
        hdop: Joi.number().required(),
        course: Joi.number().required(),
      })
    }).min(1).required()
  }

  const error = Joi.getError(body, schema);

  if (error) {
    setResponseStatus(event, 400)
    return { message: error, success: false }
  }

  // record violations
  const { violations } = body;
  const vehicle = await prisma.vehicle.findUnique({
    where: {
      number_plate
    },
    include: {
      user: true,
      route: true,
      geofence: true,
    }
  });

  if (!vehicle) {
    setResponseStatus(event, 400)
    return { data: {}, message: "Vehicle not found", success: false }
  }

  await prisma.$transaction(async prisma => {

    const rawViolations = violations.map(violation => {

      const { data } = violation;
      let type = violation.type;

      if (violation.type === ViolationType.GEOFENCE) {
        const { lat, lon } = data;

        if (vehicle.geofence_alert_recipients)
          sendGeofenceViolationEmail(vehicle.geofence_alert_recipients, vehicle.number_plate, lat, lon, new Date(), vehicle.lock_engine_on_geofence_violation)
        
        if (vehicle.geofence)
          type = ViolationType.GEOFENCE;
        else
          type = ViolationType.ROUTE;
      }

      return {
        vehicle_id: vehicle.id,
        company_id: vehicle.company_id,
        user_id: vehicle.user[0]?.id,
        type,
        data,
      }
    });

    await prisma.violation.createMany({
      data: rawViolations
    });
  });

  // respond
  return {
    data: {},
    message: "",
    success: true
  }

});
