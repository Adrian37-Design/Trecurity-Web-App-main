import { ApprovalLevel } from "@prisma/client";
import { getPaginationParams } from "../utils";
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

  // fetch data
  const { start, length } = getPaginationParams(event);

  const alerts = await prisma.sOSAlert.findMany({
    where: {
      help_dispatched: false
    },
    orderBy: {
      created_at: 'desc'
    },
    skip: start,
    take: length,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          surname: true,
          email: true,
          phone: true
        }
      },
      vehicle: {
        select: {
          id: true,
          number_plate: true
        }
      }
    }
  });

  const recordsTotal = await prisma.sOSAlert.count();

  return {
    data: alerts,
    success: true,
    recordsTotal,
    recordsFiltered: alerts.length,
  };



})

