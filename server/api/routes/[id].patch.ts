import { ApprovalLevel } from "@prisma/client";
import Joi from "@xavisoft/joi";
import { createLog } from "~/vendors/logs";
import { prisma } from "~~/prisma/db";

export default defineEventHandler(async (event) => {

  // auth
  const user_id = event.context.user?.id;
  if (!user_id) {
    setResponseStatus(event, 401);
    return;
  }

  const approvalLevel = event.context.user.approval_level;

  if (approvalLevel !== ApprovalLevel.SUPER_ADMIN) {
    setResponseStatus(event, 403);
    return;
  }

  // validate payload
  const schema = Joi.object({
    name: Joi.string(),
    bounds: Joi.array().items({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
    }).min(3),
  }).min(1);

  const body = await readBody(event);
  const error = Joi.getError(body, schema);

  if (error) {
    setResponseStatus(event, 400);
    return {
      data: {},
      message: error,
      success: false
    }
  }

  // update route
  const { id } = getRouterParams(event);

  const route = await prisma.route.update({
    where: {
      id
    },
    data: body
  });

  // save action
  createLog('ROUTE', user_id, 'UPDATE', `Route ${route.name} updated`);

  return {
    data: route,
    success: true
  };

});
