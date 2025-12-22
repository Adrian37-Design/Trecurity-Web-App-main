
import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {

    // auth
    const user_id = event.context.user?.id as string; 

    if(!user_id) {
        setResponseStatus(event, 401)
        return { data: {}, message: "Not Authenticated", success: false }
    }

    // Get company ID from the User's data
    const user = await prisma.user.findUnique({
        where: {
            id: user_id
        }
    })

    const company_id = user.company_where_user_is_admin_id

    const _company_admins = prisma.user.count({
        where: {
            AND: [
                {
                    company_where_user_is_admin_id: company_id
                },
                {
                    status: true
                },
                {
                    approval_level: 'COMPANY_ADMIN'
                }
            ]
        }
    })

    const _users = prisma.user.count({
        where: {
            AND: [
                {
                    company_where_user_is_customer_id: company_id
                },
                {
                    status: true
                },
                {
                    approval_level: {
                        not: 'COMPANY_ADMIN'
                    }
                }
            ]
        }
    })

    const _vehicles = prisma.vehicle.count({
        where: {
            AND: [
                {
                    company_id
                },
                {
                    status: true
                }
            ]
        }
    })

    const _company = prisma.company.findUnique({
        where: {
            id: company_id
        }
    })

    const [ company_admins, users, vehicles, company ] = await prisma.$transaction([ _company_admins, _users, _vehicles, _company ]);

    // respond
    return {
        data: { company_admins, users, vehicles, company },
        message: "",
        success: true
    }
});