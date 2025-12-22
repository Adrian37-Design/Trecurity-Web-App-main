import { ApprovalLevel } from "@prisma/client";
import { getPaginationParams } from "../utils";
import { prisma } from "~~/prisma/db";

export default defineEventHandler(async (event) => {

  // check auth
  const userId: string = event.context.user?.id;

  if (!userId) {
    setResponseStatus(event, 401);
    return { message: 'Unauthorized' };
  }

  // get violations
  /// query object
  //// based on user role
  const approvalLevel = event.context.user.approval_level as typeof ApprovalLevel[keyof typeof ApprovalLevel];
  const companyId = event.context.user.company_id as string;
  const query = {};

  if (approvalLevel === ApprovalLevel.COMPANY_ADMIN)
    query['company_id'] = companyId;
  else if (approvalLevel === ApprovalLevel.USER)
    query['user_id'] = userId;

  //// based on query params
  const { vehicle_id, user_id } = getQuery(event);

  if (vehicle_id)
    query['vehicle_id'] = vehicle_id;
  if (user_id && approvalLevel !== ApprovalLevel.USER)
    query['user_id'] = user_id;

  /// fetch data
  const { draw, start, length } = getPaginationParams(event);

  const violations = await prisma.violation.findMany({
    where: query,
    orderBy: {
      created_at: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          surname: true,
        }
      },
      vehicle: {
        select: {
          id: true,
          number_plate: true,
          type: true,
        }
      },
    },
    skip: start,
    take: length,
  });

  const recordsTotal = await prisma.violation.count({ where: query });

  setResponseStatus(event, 200);

  return {
    draw,
    data: violations,
    recordsTotal,
    recordsFiltered: violations.length,
    success: true,
  }

})

