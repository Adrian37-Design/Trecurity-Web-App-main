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

  // fetch data
  const { start, length } = getPaginationParams(event);
  const { date_from, date_to } = getQuery(event);

  const where: any = {
    help_dispatched: false
  };

  const { company_id } = event.context.user;

  if (approvalLevel === ApprovalLevel.COMPANY_ADMIN || approvalLevel === ApprovalLevel.USER) {
    // Filter by company
    where.vehicle = {
      company_id: company_id
    };
  } else if (approvalLevel !== ApprovalLevel.SUPER_ADMIN && approvalLevel !== ApprovalLevel.MASTER_ADMIN) {
    // If not one of the allowed roles (shouldn't happen with valid auth, but safe fallback)
    setResponseStatus(event, 403);
    return;
  }

  if (date_from && date_to) {
    where.created_at = {
      gte: new Date(date_from as string),
      lte: new Date(date_to as string)
    }
  }

  const alerts = await prisma.sOSAlert.findMany({
    where,
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

  const recordsTotal = await prisma.sOSAlert.count({ where });

  return {
    data: alerts,
    success: true,
    recordsTotal,
    recordsFiltered: alerts.length,
  };



})

