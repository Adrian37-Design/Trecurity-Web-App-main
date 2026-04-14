import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";

export default defineEventHandler(async (event) => {
    try {
        // auth
        const user_id = event.context.user?.id as string;

        if (!user_id) {
            setResponseStatus(event, 401)
            return { data: {}, message: "Not Authenticated", success: false }
        }

        // Get user data
        const user = await prisma.user.findUnique({
            where: {
                id: user_id
            }
        });

        if (!user) {
            setResponseStatus(event, 404);
            return { data: {}, message: "User not found", success: false };
        }

        // Determine Company ID robustly
        let company_id = user.company_where_user_is_admin_id || user.company_where_user_is_customer_id;

        if (!company_id) {
            const dbUser = await prisma.user.findUnique({
                where: { id: user_id },
                include: {
                    companies_managed: { select: { id: true } },
                    companies_joined: { select: { id: true } }
                }
            });
            company_id = dbUser?.companies_managed?.[0]?.id || dbUser?.companies_joined?.[0]?.id;
        }

        const isMaster = user.approval_level === "MASTER_ADMIN";
        
        // If not Master and no company linked, they see 0 vehicles
        if (!isMaster && !company_id) {
            return {
                data: { vehicles: 0, company: null },
                message: "No company association found",
                success: true
            }
        }

        const where: any = { status: true };
        if (!isMaster) {
            where.company_id = company_id;
        }

        const _vehicles = prisma.vehicle.count({
            where: where
        })

        const _company = prisma.company.findUnique({
            where: {
                id: company_id
            }
        })

        const [vehicles, company] = await prisma.$transaction([_vehicles, _company])

        return {
            data: { vehicles, company },
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