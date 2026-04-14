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
        let company_id = event.context.user.company_id;
        
        // Deep check for company if missing in context (prevents bypass)
        if (!company_id && approvalLevel !== ApprovalLevel.MASTER_ADMIN) {
            const dbUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { 
                    company_where_user_is_admin_id: true, 
                    company_where_user_is_customer_id: true,
                    companies_managed: { select: { id: true } }
                }
            });
            company_id = dbUser?.company_where_user_is_admin_id || 
                         dbUser?.company_where_user_is_customer_id || 
                         dbUser?.companies_managed?.[0]?.id;
        }

        const isMaster = approvalLevel === ApprovalLevel.MASTER_ADMIN;

        if (!isMaster) {
            if (company_id) {
                (where as any).company_id = company_id;
            } else {
                return { data: [] }; // No company, no results
            }
        } else if (event.context.user.company_id) {
            // Master can optionally filter by company
            (where as any).company_id = event.context.user.company_id;
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

