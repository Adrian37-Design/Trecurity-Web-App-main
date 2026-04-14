import { SOSAlertType } from "@prisma/client";
import Joi from "@xavisoft/joi";
import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
  
  // auth
  const number_plate = event.context.vehicle?.number_plate;
  if (!number_plate) {
    setResponseStatus(event, 401);
    return;
  }

  // validate schema
  const body = await readBody(event);

  const schema = {
    type: Joi.valid(...Object.values(SOSAlertType)).required(),
    lat: Joi.number().required(),
    lon: Joi.number().required(),
  }

  const error = Joi.getError(body, schema);
  if (error) {
    setResponseStatus(event, 400);
    return { message: error }
  }

  // create
  const vehicle = await prisma.vehicle.findUnique({
    where: {
      number_plate
    },
    include: {
      user: true
    }
  });

  const { type, lat, lon } = body;
  
  await prisma.sOSAlert.create({
    data: {
      type,
      lat,
      lon,
      vehicle: {
        connect: {
          id: vehicle.id
        }
      },
      user: {
        connect: {
          id: vehicle.user.at(0)?.id
        }
      }
    }
  });
  
  // respond
  return { message: 'Created successfully' }

})
