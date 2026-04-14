import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';

export default defineEventHandler(async (event) => {
    try {

        // auth
        const user_id = event.context.user?.id as string;
        console.log("DEBUG: Super Admin Dashboard - User ID:", user_id);

        if (!user_id) {
            console.log("DEBUG: User ID missing - returning 401");
            setResponseStatus(event, 401)
            return { data: {}, message: "Not Authenticated", success: false }
        }

        // Check if this user has access to this endpoint
        if (!await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { data: {}, message: 'User does not have permission', success: false }

        // Get company_id from context (injected by auth middleware)
        const company_id = event.context.user?.company_id;
        console.log("DEBUG: Dashboard - Company ID:", company_id);

        const _super_admins = prisma.user.count({
            where: {
                AND: [
                    {
                        status: true
                    },
                    {
                        approval_level: 'SUPER_ADMIN'
                    },
                    ...(company_id ? [{
                        OR: [
                            { company_where_user_is_admin_id: company_id },
                            { company_where_user_is_customer_id: company_id }
                        ]
                    }] : [])
                ]
            }
        })

        const _companies = prisma.company.count({
            where: {
                status: true,
                ...(company_id ? { id: company_id } : {})
            }
        })

        const _users = prisma.user.count({
            where: {
                AND: [
                    {
                        status: true
                    },
                    {
                        approval_level: {
                            not: 'SUPER_ADMIN'
                        }
                    },
                    ...(company_id ? [{
                        OR: [
                            { company_where_user_is_admin_id: company_id },
                            { company_where_user_is_customer_id: company_id }
                        ]
                    }] : [])
                ]
            }
        })

        const _vehicles = prisma.vehicle.count({
            where: {
                status: true,
                ...(company_id ? { company_id: company_id } : {})
            }
        })

        const [super_admins, companies, users, vehicles] = await prisma.$transaction([_super_admins, _companies, _users, _vehicles])

        return {
            data: { super_admins, companies, users, vehicles, debug_company_id: company_id },
            message: "",
            success: true
        }
    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);

        return {
            data: {},
            message: "Server Error. Please try again later",
            success: false
        }
    }
});