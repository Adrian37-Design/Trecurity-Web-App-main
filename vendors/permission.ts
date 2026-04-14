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

    // Check if the user is a Master Admin (Platform Owner) - Access Everything
    if (user?.approval_level === "MASTER_ADMIN") return true

    // Check if the user is a Super Admin
    // If they have an assigned company, they are restricted to that company like a Company Admin
    // If they have NO assigned company, they have platform-wide access (Legacy/Reseller Admin)
    if (user?.approval_level === "SUPER_ADMIN") {
        const dbUser = await prisma.user.findUnique({
            where: { id: user_id },
            select: { company_where_user_is_admin_id: true }
        });

        if (!dbUser?.company_where_user_is_admin_id) return true; // Global Super Admin

        // If company_id is provided, check if it matches their assigned company
        if (company_id && dbUser.company_where_user_is_admin_id !== company_id) return false;
        
        // If no company_id provided, but they have an assigned one, we let them proceed but they must be filtered in the query phase
        return true; 
    }

    // If the required approval level is Company Admin, make sure they only have access to their company
    if (approval_level_required === 'COMPANY_ADMIN') {
        if (!company_id) return false; // Safety check

        const company_where_is_admin = await prisma.company.count({
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

        if (company_where_is_admin > 0) {
            return true
        } else {
            return false
        }
    }

    // If the user has a USER approval level, ensure that they are only accessing their data
    if (approval_level_required === 'USER') {
        if (!company_id) return false; // Safety check

        const company_where_is_customer = await prisma.company.count({
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

        if (company_where_is_customer > 0) {
            return true
        } else {
            return false
        }
    }

    return false
}
