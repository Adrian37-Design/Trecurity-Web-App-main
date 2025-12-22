

import Joi from "@xavisoft/joi";
import sketch from "./sketch";
import { ApprovalLevel } from "@prisma/client";

export default defineEventHandler(async (event) => {

  // auth
  const user_id: string = event.context.user?.id;

  if (!user_id) {
    setResponseStatus(event, 401)
    return { message: "Unauthorized", success: false }
  }

  const approvalLevel = event.context.user?.approval_level;

  if (approvalLevel !== ApprovalLevel.SUPER_ADMIN) {
    setResponseStatus(event, 401)
    return { message: "Unauthorized", success: false }
  }

  // validate body
  const schema = {
    base64: Joi.string().base64().required(),
  }

  const body = await readBody(event);
  const error = Joi.getError(body, schema);

  if (error) {
    setResponseStatus(event, 400)
    return { message: error, success: false }
  }

  // save sketch
  const { base64 } = body;
  await sketch.saveSketch(base64);

  // respond
  const data = await sketch.getSketchInfo();

  return { data, success: true }


})

