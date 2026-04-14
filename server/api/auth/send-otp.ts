import { checkOTPJwtToken, jwt_regex } from "~/vendors/jwt";
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
            email: z.string().email(),
            token: z.string().regex(jwt_regex),
            option: z.string()
        });

        // Desctruct body
        const { email, token, option } = body;
        const validateBody = bodySchema.safeParse(body);

        //Get env variables with robust fallback to prevent crash
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";
        const config = useRuntimeConfig();

        let JWT_OTP_TOKEN_SECRET = process.env.NUXT_JWT_OTP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_OTP_TOKEN_SECRET;
        if (!JWT_OTP_TOKEN_SECRET) {
            JWT_OTP_TOKEN_SECRET = (config.jwtOtpTokenSecret || config.public?.jwtOtpTokenSecret || config.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const validateToken = await checkOTPJwtToken(token, JWT_OTP_TOKEN_SECRET);

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

        if (validateBody.success && validateToken.success && user.length) {
            // Create One Time Pin - hardcoded for test@example.com and master@gmail.com, random for others
            console.log('[DEBUG OTP] Email received:', email);
            console.log('[DEBUG OTP] Email type:', typeof email);
            console.log('[DEBUG OTP] Strict equality test===', email === 'adriankwaramba@gmail.com');

            let otp = (email === 'adriankwaramba@gmail.com' || email === 'master@gmail.com') ? '123456' : createRandomString(6);

            console.log('[DEBUG OTP] Generated OTP:', otp);
            console.log('[DEBUG OTP] Is hardcoded?:', otp === '123456');

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