import { ApprovalLevel } from "@prisma/client";
import { prisma } from "~~/prisma/db";
import Joi from "@xavisoft/joi";

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

  // validate schema
  const body = await readBody(event);
  const schema = Joi.object({
    help_dispatched: Joi.boolean(),
  })
    .min(1);

  const error = Joi.getError(body, schema);
  if (error) {
    setResponseStatus(event, 400);
    return {
      message: error
    }
  }

  // update
  const { id } = getRouterParams(event);

  await prisma.sOSAlert.update({
    where: {
      id
    },
    data: body
  });

  // respond
  return {
    success: true
  };

})
