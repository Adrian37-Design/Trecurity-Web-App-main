import { createOTPJwtToken, createDummyJwtToken } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { createLog } from "~/vendors/logs";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        //Get env variables
        const JWT_OTP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_OTP_TOKEN_SECRET;

        //Validate input
        const bodySchema = z.object({
            email: z.string().email(),
            newPassword: z.string().min(8),
            confirmNewPassword: z.string().min(8),
            recaptcha_token: z.string()
        });

        //Desctruct body
        let { email, newPassword, confirmNewPassword, recaptcha_token } = body;

        const { success } = bodySchema.safeParse(body);

        if (!success) {
            return {
                data: {},
                message: 'Input is in the wrong format',
                token: "",
                open_two_factor_auth: false,
                success: false
            }
        }

        //Get env variables
        const RECAPTCHA_SERVER_SITE_KEY = process.env.NUXT_RECAPTCHA_SERVER_SITE_KEY;

        // Verify Recaptcha (skip if not configured)
        if (process.env.NODE_ENV === 'production') {
            // Skip reCAPTCHA if not configured or token is empty
            if (RECAPTCHA_SERVER_SITE_KEY && recaptcha_token) {
                const verify = await verifyGoogleRecaptcha(recaptcha_token, RECAPTCHA_SERVER_SITE_KEY);

                if (!verify.success || verify.score === 0) {
                    return {
                        data: {},
                        message: "Verification Failed. Please try again later.",
                        success: false
                    }
                }
            }
        }

        // Check if passwords match
        if (newPassword !== confirmNewPassword) {
            return {
                data: {},
                message: 'The password and confirm password do not match',
                token: "",
                open_two_factor_auth: false,
                success: false
            }
        }

        //Check if the user exists
        let users = await prisma.user.findMany({
            where: {
                email
            }
        })
            .catch(error => {
                console.error(error)

                return []
            });

        if (users.length > 0) {
            // Create a JWT token
            const token = await createOTPJwtToken(JWT_OTP_TOKEN_SECRET);

            // Create log
            createLog('Forgot Password', users?.at(0).id, 'Authentication', 'Initiated the forgot password process')

            return {
                data: {},
                message: "",
                token,
                open_two_factor_auth: true,
                success: true
            }
        } else {
            const token = await createDummyJwtToken();

            return {
                data: {},
                message: "",
                token,
                open_two_factor_auth: true,
                success: true
            }
        }
    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);

        return {
            data: {},
            message: 'Server error. Please try again later',
            token: "",
            open_two_factor_auth: false,
            success: false
        }
    }
});

const verifyGoogleRecaptcha = async (token, server_site_key) => {
    // Hitting POST request to the URL, Google will
    // respond with success or error scenario.
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${server_site_key}&response=${token}`;

    // Making POST request to verify captcha
    const verify: any = await $fetch(url, {
        method: "POST"
    });

    return verify
}