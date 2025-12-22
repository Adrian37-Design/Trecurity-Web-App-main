import { ApprovalLevel } from "@prisma/client";
import { prisma } from "~~/prisma/db";
import { getPaginationParams } from "../utils";

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

  // fetch data
  const { start, length } = getPaginationParams(event);

  const routes = await prisma.route.findMany({
    skip: start,
    take: length,
  });

  const recordsTotal = await prisma.route.count();

  return {
    data: routes,
    success: true,
    recordsTotal,
    recordsFiltered: routes.length,
  };

});

