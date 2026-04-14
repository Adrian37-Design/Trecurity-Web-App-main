import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";

export default defineEventHandler(async (event) => {
    try {

        // auth
        const user_id = event.context.user?.id;

        if (!user_id) {
            setResponseStatus(event, 401);
            return {
                data: {},
                message: "Unauthorized",
                success: false
            }
        }

        // fetch user
        const user = await prisma.user.findUnique({
            where: {
                id: user_id
            },
            select: {
                name: true,
                surname: true,
                email: true,
                phone: true,
                two_factor_auth: true,
                status: true,
                approval_level: true
            }
        });

        return {
            data: user,
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