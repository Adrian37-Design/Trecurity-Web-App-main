import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { createLog } from "~/vendors/logs";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // Validate input
        const bodySchema = z.object({
            delete_company_id: z.string().cuid(),
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        const { delete_company_id, user_id, token } = body;

        const validateBody = bodySchema.safeParse(body);

        if (!validateBody.success) {
            setResponseStatus(event, 400);
            return { data: {}, message: 'Input is in the wrong format', success: false }
        }

        // Get env variables
        const config = useRuntimeConfig();
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateToken.success) {
            return { data: {}, message: 'Session is invalid (Token Check Failed)', success: false }
        }

        // Get requesting user
        const requestingUser = await prisma.user.findUnique({
            where: { id: user_id },
            select: {
                approval_level: true,
                company_where_user_is_admin_id: true
            }
        });

        if (!requestingUser) {
            setResponseStatus(event, 401);
            return { data: {}, message: 'User not found', success: false };
        }

        // Permission check: Only MASTER_ADMIN or SUPER_ADMIN can delete companies
        const isMaster = requestingUser.approval_level === 'MASTER_ADMIN';
        const isSuper = requestingUser.approval_level === 'SUPER_ADMIN';

        if (!isMaster && !isSuper) {
            setResponseStatus(event, 403);
            return { data: {}, message: 'Permission denied. Only Admins can delete companies.', success: false };
        }

        // Get company to be deleted
        const companyToDelete = await prisma.company.findUnique({
            where: { id: delete_company_id },
            include: {
                child_companies: true,
                vehicles: true
            }
        });

        if (!companyToDelete) {
            setResponseStatus(event, 404);
            return { data: {}, message: 'Company not found', success: false };
        }

        // Security Check: Cannot delete a company that has child companies
        if (companyToDelete.child_companies.length > 0) {
            return { data: {}, message: 'Cannot delete a company that has resellers/clients. Please delete those first.', success: false };
        }

        // Security Check: Cannot delete your own company if you are a SUPER_ADMIN assigned to it
        if (isSuper && requestingUser.company_where_user_is_admin_id === delete_company_id) {
            return { data: {}, message: 'Security Alert: You cannot delete your own active management account. Please contact a Master Admin.', success: false };
        }

        // START CLEANUP
        const vehicleIds = companyToDelete.vehicles.map(v => v.id);

        // 1. Clean up vehicle-associated data
        if (vehicleIds.length > 0) {
            await prisma.trackingData.deleteMany({ where: { vehicle_id: { in: vehicleIds } } });
            await prisma.geofence.deleteMany({ where: { vehicle_id: { in: vehicleIds } } });
            await prisma.violation.deleteMany({ where: { vehicle_id: { in: vehicleIds } } });
            await prisma.controllerCommand.deleteMany({ where: { vehicle_id: { in: vehicleIds } } });
            await prisma.sOSAlert.deleteMany({ where: { vehicle_id: { in: vehicleIds } } });
            await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } });
        }

        // 2. Clean up company-specific violations (if any not tied to specific vehicles)
        await prisma.violation.deleteMany({ where: { company_id: delete_company_id } });

        // 3. Clear user legacy associations to prevent broken foreign keys
        // (Note: Many-to-Many relations in 'admins' and 'customers' are handled by Prisma on company delete)
        await prisma.user.updateMany({
            where: { company_where_user_is_admin_id: delete_company_id },
            data: { company_where_user_is_admin_id: null }
        });
        await prisma.user.updateMany({
            where: { company_where_user_is_customer_id: delete_company_id },
            data: { company_where_user_is_customer_id: null }
        });

        // 4. Finally, delete the company
        await prisma.company.delete({
            where: { id: delete_company_id }
        });

        // Create log
        await createLog(
            'Delete',
            user_id,
            'Company',
            `Deleted company ${companyToDelete.name} (${companyToDelete.id}) and its associated data (${vehicleIds.length} vehicles cleaned up).`
        );

        return {
            data: {},
            message: 'Company successfully deleted',
            success: true
        };

    } catch (error) {
        console.error("Company Deletion Error:", error);
        setResponseStatus(event, 500);

        return {
            data: {},
            message: "Server Error: " + (error as Error).message,
            success: false
        }
    }
});
