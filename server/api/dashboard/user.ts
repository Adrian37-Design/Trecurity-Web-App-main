import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";

export default defineEventHandler(async (event) => {
    try {
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

        const company_id = user.company_where_user_is_customer_id

        const _vehicles = prisma.vehicle.count({
            where: {
                AND: [
                    {
                        user: {
                            some: {
                                id: user_id
                            }
                        }
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

        const [ vehicles, company ] = await prisma.$transaction([ _vehicles, _company ])

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