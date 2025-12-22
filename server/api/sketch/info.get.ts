
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

  // respond
  const data = await sketch.getSketchInfo();

  return { data, success: true }
})

