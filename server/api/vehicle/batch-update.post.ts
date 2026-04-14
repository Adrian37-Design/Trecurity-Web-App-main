
import Joi from "@xavisoft/joi";
import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
    // auth
    const user = event.context.user;
    if (!user || user.approval_level !== 'SUPER_ADMIN') {
        // Only Super Admin can bulk enable/disable for now? 
        // User asked "enable/disable all vehicles(high)". Assuming high level access.
        // Actually, Company Admin should probably be able to disable their own vehicles too.
        // Let's stick to SUPER_ADMIN/COMPANY_ADMIN check.

        if (user.approval_level !== 'COMPANY_ADMIN' && user.approval_level !== 'SUPER_ADMIN') {
            setResponseStatus(event, 403);
            return { message: "Unauthorized", success: false };
        }
    }

    // validate body
    const body = await readBody(event);
    const schema = {
        ids: Joi.array().items(Joi.string().required()).min(1).required(),
        status: Joi.boolean().required()
    };

    const error = Joi.getError(body, schema);
    if (error) {
        setResponseStatus(event, 400);
        return { message: error, success: false };
    }

    const { ids, status } = body;

    // Company Admin restriction
    let whereClause: any = {
        id: { in: ids }
    };

    if (user.approval_level === 'COMPANY_ADMIN') {
        const companyId = user.company_id;
        if (!companyId) return { message: "Unauthorized", success: false };

        whereClause = {
            AND: [
                { id: { in: ids } },
                { company_id: companyId }
            ]
        }
    }

    // Execute Update
    const result = await prisma.vehicle.updateMany({
        where: whereClause,
        data: {
            status: status
        }
    });

    return {
        data: result,
        message: `${result.count} vehicles updated successfully`,
        success: true
    };
});
