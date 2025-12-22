import { prisma } from "~/prisma/db";
import { type ApprovalLevel } from "@prisma/client";

export const isAllowedOnEndpoint = async (approval_level_required: ApprovalLevel, company_id: string, user_id: string) => {
    // Get user data
    const user = await prisma.user.findUnique({
        where: {
            id: user_id
        },
        select: {
            approval_level: true
        }
    })

    // Check if the user is a Super Admin
    if (user?.approval_level === "SUPER_ADMIN") return true

    // If the required approval level is Company Admin, make sure they only have access to their company
    const company_where_is_admin = await prisma.company.findMany({
        where: {
            AND: [
                {
                    id: company_id
                },
                {
                    admins: {
                        some: {
                            id: user_id
                        }
                    }
                }
            ]
        }
    })

    if (approval_level_required === 'COMPANY_ADMIN') {
        if (company_where_is_admin.length > 0) {
            return true
        } else {
            return false
        }
    }

    // If the user has a USER approval level, ensure that they are only accessing their data
    const company_where_is_customer = await prisma.company.findMany({
        where: {
            AND: [
                {
                    id: company_id
                },
                {
                    customers: {
                        some: {
                            id: user_id
                        }
                    }
                }
            ]
        }
    })

    if (approval_level_required === 'USER') {
        if (company_where_is_customer.length > 0) {
            return true
        } else {
            return false
        }
    }

    return false
}
