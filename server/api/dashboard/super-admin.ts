import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';

export default defineEventHandler(async (event) => {
    try {

        // auth
        const user_id = event.context.user?.id as string; 

        if(!user_id) {
            setResponseStatus(event, 401)
            return { data: {}, message: "Not Authenticated", success: false }
        }

        // Check if this user has access to this endpoint
        if(!await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { data: {}, message: 'User does not have permission', success: false }

        const _super_admins = prisma.user.count({
            where: {
                AND: [
                    {
                        status: true
                    },
                    {
                        approval_level: 'SUPER_ADMIN'
                    }
                ]
            }
        })

        const _companies = prisma.company.count({
            where: {
                status: true
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
                    }
                ]
            }
        })

        const _vehicles = prisma.vehicle.count({
            where: {
                status: true
            }
        })

        const [ super_admins, companies, users, vehicles ] = await prisma.$transaction([ _super_admins, _companies, _users, _vehicles ])

        return {
            data: { super_admins, companies, users, vehicles },
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