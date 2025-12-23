import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';
import { ApprovalLevel } from "@prisma/client";

export default defineEventHandler(async (event) => {


    // auth
    const user_id = event.context.user?.id;
    if (!user_id) {
        setResponseStatus(event, 401);
        return;
    }

    // get data
    /// build query
    const { id } = getRouterParams(event);
    const { date_from = 0, date_to = Date.now() } = getQuery(event);

    const where = {
        vehicle_id: id,
        time_from: {
            gt: new Date(date_from.toString()),
            lte: new Date(date_to.toString()),
        }
    } as any;

    /// permission
    if (!event.context.user) {
        setResponseStatus(event, 401);
        return { data: [], message: 'User not authenticated', success: false };
    }

    const approvalLevel = event.context.user.approval_level;
    const { company_id } = event.context.user;

    if (approvalLevel === ApprovalLevel.COMPANY_ADMIN) {
        where.vehicle = {
            company_id: company_id
        };
    } else if (approvalLevel === ApprovalLevel.USER) {
        where.vehicle = {
            user: {
                some: {
                    id: user_id
                }
            }
        };
    }


    /// retrieve
    const tracking_data = await prisma.trackingData.findMany({
        where,
        include: {
            geofence: true,
        }
    })

    return { data: tracking_data }

});
