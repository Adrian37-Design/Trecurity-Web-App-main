import { ApprovalLevel } from "@prisma/client";
import { createLog } from "~/vendors/logs";
import { prisma } from "~~/prisma/db";

export default defineEventHandler(async (event) => {

  // auth
  const userId = event.context.user.id;

  if (!userId) {
    setResponseStatus(event, 401);
    return;
  }

  const approvalLevel = event.context.user.approval_level;

  if (approvalLevel !== ApprovalLevel.SUPER_ADMIN) {
    setResponseStatus(event, 403);
    return;
  }

  // delete
  const { id } = getRouterParams(event);

  await prisma.route.delete({
    where: {
      id
    }
  });

  // save action
  createLog('ROUTE', userId, 'DELETE', `Route ${id} deleted`);

  return {
    success: true
  };

})
