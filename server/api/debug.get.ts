
import { prisma } from "~~/prisma/db";
import { checkAppJwtToken } from "~/vendors/jwt";

export default defineEventHandler(async (event) => {
    try {
        const token = getCookie(event, 'token') || "";
        const config = useRuntimeConfig();
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const payload = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET);

        if (!payload.success) {
            return {
                status: "Token Invalid or Missing",
                token_payload: payload
            }
        }

        const user_id = payload.user_id;

        // Fetch User with ALL relations
        const user = await prisma.user.findUnique({
            where: { id: user_id },
            include: {
                companies_managed: true, // New relation
                companies_joined: true,  // New relation
                company_where_user_is_admin: true, // Legacy
                company_where_user_is_customer: true, // Legacy
                vehicles: true // Direct assignment
            }
        });

        if (!user) {
            return { status: "User Not Found in DB", user_id }
        }

        // Logic Check
        let resolved_company_id = event.context.user?.company_id || "NOT_IN_CONTEXT";
        let fallback_logic_result = "NONE";

        if (user.companies_managed && user.companies_managed.length > 0) {
            fallback_logic_result = `Managed: ${user.companies_managed[0].name} (${user.companies_managed[0].id})`;
        } else if (user.companies_joined && user.companies_joined.length > 0) {
            fallback_logic_result = `Joined: ${user.companies_joined[0].name} (${user.companies_joined[0].id})`;
        } else if (user.company_where_user_is_admin && user.company_where_user_is_admin.length > 0) { // Legacy check if relation is array
            fallback_logic_result = `Legacy Admin Rel: ${user.company_where_user_is_admin[0].id}`;
        } else if (user.company_where_user_is_admin_id) {
            fallback_logic_result = `Legacy Admin ID: ${user.company_where_user_is_admin_id}`;
        } else if (user.company_where_user_is_customer_id) {
            fallback_logic_result = `Legacy Customer ID: ${user.company_where_user_is_customer_id}`;
        }

        // Try the actual vehicle query
        let vehicle_count_using_context = -1;
        if (event.context.user?.company_id) {
            vehicle_count_using_context = await prisma.vehicle.count({
                where: { company_id: event.context.user.company_id }
            });
        }

        // Check fallback vehicles
        let vehicle_count_using_fallback = -1;
        let fallback_id = null;
        if (user.companies_managed && user.companies_managed.length > 0) {
            fallback_id = user.companies_managed[0].id;
        } else if (user.companies_joined && user.companies_joined.length > 0) {
            fallback_id = user.companies_joined[0].id;
        } else if (user.company_where_user_is_admin && user.company_where_user_is_admin.length > 0) { // Legacy check
            fallback_id = user.company_where_user_is_admin[0].id;
        } else if (user.company_where_user_is_admin_id) {
            fallback_id = user.company_where_user_is_admin_id;
        } else if (user.company_where_user_is_customer_id) {
            fallback_id = user.company_where_user_is_customer_id;
        }

        if (fallback_id) {
            vehicle_count_using_fallback = await prisma.vehicle.count({
                where: { company_id: fallback_id }
            });
        }

        return {
            status: "Debug Info",
            user_basic: {
                id: user.id,
                email: user.email,
                approval_level: user.approval_level
            },
            token_context: event.context.user,
            db_relations: {
                companies_managed: user.companies_managed,
                companies_joined: user.companies_joined,
                legacy_admin_id: user.company_where_user_is_admin_id,
                legacy_customer_id: user.company_where_user_is_customer_id
            },
            logic_check: {
                resolved_company_from_token: resolved_company_id,
                fallback_found_id: fallback_id,
                fallback_would_find: fallback_logic_result,
                vehicles_found_using_token_company: vehicle_count_using_context,
                vehicles_found_using_fallback_id: vehicle_count_using_fallback,
                active_vehicle_count,
                vehicles: vehicle_list
            }
        }

    } catch (e: any) {
        return {
            status: "Error",
            message: e.message,
            stack: e.stack
        }
    }
});
