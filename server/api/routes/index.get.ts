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

  const { company_id } = event.context.user;

  // fetch data
  const { start, length } = getPaginationParams(event);

  const where = {};

  if (approvalLevel === ApprovalLevel.USER || approvalLevel === ApprovalLevel.COMPANY_ADMIN) {
    let target_company_id = company_id;

    if (!target_company_id) {
      // Fallback logic
      const user = await prisma.user.findUnique({
        where: { id: user_id },
        include: {
          companies_managed: { select: { id: true } },
          companies_joined: { select: { id: true } },
          company_where_user_is_admin: { select: { id: true } }, // Legacy
          company_where_user_is_customer: { select: { id: true } } // Legacy
        }
      });

      if (user && user.companies_managed.length > 0) target_company_id = user.companies_managed[0].id;
      else if (user && user.companies_joined.length > 0) target_company_id = user.companies_joined[0].id;
      else if (user && user.company_where_user_is_admin) target_company_id = user.company_where_user_is_admin[0]?.id; // Legacy
      else if (user && user.company_where_user_is_customer_id) target_company_id = user.company_where_user_is_customer_id; // Legacy
    }

    if (target_company_id) {
      where.Vehicle = { some: { company_id: target_company_id } };
    } else {
      // If still no company_id, return empty safely
      return {
        data: [],
        success: true,
        recordsTotal: 0,
        recordsFiltered: 0,
      };
    }
  }

  const { date_from, date_to } = getQuery(event);

  if (date_from && date_to) {
    where['created_at'] = {
      gte: new Date(date_from as string),
      lte: new Date(date_to as string)
    }
  }

  const routes = await prisma.route.findMany({
    where,
    skip: start,
    take: length,
  });

  const recordsTotal = await prisma.route.count({ where });

  return {
    data: routes,
    success: true,
    recordsTotal,
    recordsFiltered: routes.length,
  };

});

