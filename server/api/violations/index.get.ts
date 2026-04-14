import { ApprovalLevel } from "@prisma/client";
import { getPaginationParams } from "../utils";
import { prisma } from "~~/prisma/db";

export default defineEventHandler(async (event) => {

  // auth
  const auth_user_id = event.context.user?.id;
  if (!auth_user_id) {
    setResponseStatus(event, 401);
    return { message: 'Unauthorized' };
  }

  // get violations
  const { draw, start, length } = getPaginationParams(event);

  /// query object
  //// based on user role
  const approvalLevel = event.context.user.approval_level as typeof ApprovalLevel[keyof typeof ApprovalLevel];
  let companyId = event.context.user.company_id as string;
  const query = {};

  // Robust Fallback for companyId
  if (!companyId) {
    const user = await prisma.user.findUnique({
      where: { id: auth_user_id },
      include: {
        companies_managed: { select: { id: true } },
        companies_joined: { select: { id: true } },
        company_where_user_is_admin: { select: { id: true } },
        company_where_user_is_customer: { select: { id: true } }
      }
    });

    if (user && user.companies_managed.length > 0) companyId = user.companies_managed[0].id;
    else if (user && user.companies_joined.length > 0) companyId = user.companies_joined[0].id;
    else if (user && user.company_where_user_is_admin) companyId = user.company_where_user_is_admin[0]?.id;
    else if (user && user.company_where_user_is_customer_id) companyId = user.company_where_user_is_customer_id;
  }

  if (approvalLevel === ApprovalLevel.COMPANY_ADMIN || approvalLevel === ApprovalLevel.USER) {
    if (!companyId) {
      // If truly no company, then maybe fall back to user_id for USER? 
      // But consistency suggests we should show empty if unlinked.
      // Let's keep it safe.
      if (approvalLevel === ApprovalLevel.USER) {
        query['user_id'] = auth_user_id;
      } else {
        return {
          data: [],
          draw,
          recordsTotal: 0,
          recordsFiltered: 0,
          success: true
        }
      }
    } else {
      query['company_id'] = companyId;
    }
  }

  //// based on query params
  const { vehicle_id, user_id, date_from, date_to } = getQuery(event);

  if (vehicle_id)
    query['vehicle_id'] = vehicle_id;
  if (user_id && approvalLevel !== ApprovalLevel.USER)
    query['user_id'] = user_id;

  if (date_from && date_to) {
    query['created_at'] = {
      gte: new Date(date_from as string),
      lte: new Date(date_to as string)
    }
  }

  /// fetch data

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

