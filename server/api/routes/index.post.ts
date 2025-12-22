import { ApprovalLevel } from "@prisma/client";
import Joi from "@xavisoft/joi";
import { createLog } from "~/vendors/logs";

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

  // verify payload
  const schema = {
    name: Joi.string().required(),
    bounds: Joi.array().items({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
    }).min(3).required(),
  }

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

  // create route
  const route = await prisma.route.create({
    data: body
  });

  // save action
  createLog('ROUTE', user_id, 'CREATE', `Route ${route.name} created`);

  return {
    data: route,
    success: true
  };

})

