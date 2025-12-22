import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';
import { ApprovalLevel } from "@prisma/client";

export default defineEventHandler(async (event) => {
    try {

        // auth
        const userId: string = event.context.user?.id;

        if (!userId) {
            setResponseStatus(event, 401);
            return { message: 'Unauthorized' };
        }

        // retrieve
        /// build query
        const { query } = getQuery(event);
        if (!query) {
            setResponseStatus(event, 400);
            return { success: false, message: 'Query not specified' }
        }

        const approvalLevel = event.context.user.approval_level;

        const OR = [
            { type: { contains: query } },
            { number_plate: { contains: query } },
            {
                user: {
                    some: {
                        name: { contains: query }
                    }
                }
            },
            {
                user: {
                    some: {
                        surname: { contains: query }
                    }
                }
            },
            {
                user: {
                    some: {
                        email: { contains: query }
                    }
                }
            }
        ];

        const where = {
            status: true,
            tracking_data: {
                some: {}
            },
            OR,
        }

        //// auth
        if (approvalLevel === ApprovalLevel.COMPANY_ADMIN) {
            const { company_id } = event.context.user;
            (where as any).company_id = company_id;
        } else if (approvalLevel === ApprovalLevel.USER) {
            (where as any).user = {
                some: {
                    id: userId
                }
            }
        }

        /// retrieve data
        const vehicles = await prisma.vehicle.findMany({
            where,
            orderBy: {
                number_plate: 'desc'
            },
            take: 8,
            include: {
                tracking_data: {
                    orderBy: {
                        created_at: 'desc'
                    },
                    take: 1
                },
                company: {
                    select: { id: true, name: true }
                }
            }
        })

        return {
            data: vehicles
        }

    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);

        return {
            data: [],
            message: "Server Error. Please try again later",
            success: false
        }
    }
});

