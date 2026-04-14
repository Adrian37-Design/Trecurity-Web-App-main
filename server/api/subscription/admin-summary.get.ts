import { ApprovalLevel } from "@prisma/client";
import { prisma } from "~~/prisma/db";

export default defineEventHandler(async (event) => {

    // auth
    const user = event.context.user;
    if (!user) {
        setResponseStatus(event, 401);
        return { message: "Unauthorized", success: false };
    }

    console.log('[DEBUG_BILLING] User:', JSON.stringify(user, null, 2));

    if (user.approval_level !== ApprovalLevel.MASTER_ADMIN && user.approval_level !== ApprovalLevel.SUPER_ADMIN) {
        setResponseStatus(event, 403);
        return { message: "Forbidden", success: false };
    }

    const where: any = {};
    if (user.approval_level === ApprovalLevel.SUPER_ADMIN) {
        let companyId = user.company_id;

        if (!companyId) {
            console.warn('[DEBUG_BILLING] Company ID missing in token for Super Admin. Fetching from DB...');
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { company_where_user_is_admin_id: true }
            });
            companyId = dbUser?.company_where_user_is_admin_id;
        }

        console.log('[DEBUG_BILLING] Filtering for SUPER_ADMIN company:', companyId);

        if (!companyId) {
            console.error('[DEBUG_BILLING] ERROR: No company_id for Super Admin (Token or DB)');
            setResponseStatus(event, 403);
            return { message: "No company assigned to Super Admin", success: false };
        }
        where.id = companyId;
    }

    // Fetch all companies with their subscription details
    const companies = await prisma.company.findMany({
        where,
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            subscription_status: true,
            subscription_expiry: true,
            subscription_plan: {
                select: {
                    name: true,
                    price: true,
                    interval: true
                }
            }
        },
        orderBy: {
            created_at: 'desc'
        }
    });

    const active = [];
    const inactive = []; // Pending or Expired

    const now = new Date();

    for (const company of companies) {
        let isActive = company.subscription_status === 'ACTIVE';

        // Check expiry if active (optional specific logic, but good for "Expired" check)
        if (company.subscription_expiry && new Date(company.subscription_expiry) < now) {
            isActive = false; // Expired
        }

        if (isActive) {
            active.push(company);
        } else {
            inactive.push(company);
        }
    }

    return {
        success: true,
        data: {
            active,
            inactive
        }
    };

});
