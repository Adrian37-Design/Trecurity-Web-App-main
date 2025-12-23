import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import argon2 from "argon2";
import moment from "moment";
import { sendOTPEmail } from "~/vendors/mail";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // Validate input
        const bodySchema = z.object({
            user_id: z.string().cuid(),
            email: z.string().email(),
            token: z.string().regex(jwt_regex),
            option: z.string()
        });

        // Desctruct body
        const { user_id, email, token, option } = body;
        const validateBody = bodySchema.safeParse(body);

        //Get env variables
        const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET
        const validateAppToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id)

        let user = [];
        if (option === "register") {
            user = [{}];
        } else {
            user = await prisma.user.findMany({
                where: {
                    email
                }
            });
        }

        if (validateBody.success && validateAppToken.success && user.length) {
            // Create One Time Pin
            let otp = createRandomString(6);

            await sendOTPEmail(otp, email);

            let pin = await argon2.hash(otp);
            let expires_at: any = moment().add(30, 'm').toDate();

            //Console log OTP when Node env is in development
            if (process.env.NODE_ENV === 'development') console.log(`OTP: ${otp}`)

            return await prisma.oneTimePin.create({
                data: {
                    email,
                    pin,
                    expires_at
                }
            })
                .then(() => {
                    return {
                        message: "",
                        success: true
                    }
                })
                .catch((error) => {
                    console.error(error);

                    return {
                        message: 'An error has occurred creating the OTP',
                        success: false
                    }
                });
        } else {
            return {
                message: 'The data is incomplete',
                success: false
            }
        }
    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);

        return {
            message: 'Server error. Please try again later',
            success: false
        }
    }
});

const createRandomString = (length: number) => {
    const chars = "0123456789";  // Numeric only for easy input
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}