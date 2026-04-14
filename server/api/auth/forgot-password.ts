import { prisma } from "~/prisma/db";
import { z } from "zod";
import { createLog } from "~/vendors/logs";
import { sendPasswordResetEmail } from "~/vendors/mail";
import argon2 from 'argon2';

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        //Validate input
        const bodySchema = z.object({
            email: z.string().email(),
            recaptcha_token: z.string().optional()
        });

        const { email, recaptcha_token } = body;

        const { success } = bodySchema.safeParse(body);

        if (!success) {
            return {
                data: {},
                message: 'Input is in the wrong format',
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

        //Check if the user exists
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            // Generate Random Password
            const tempPassword = createRandomString(10);
            const hashedPassword = await argon2.hash(tempPassword);

            // Update User Password
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword
                }
            });

            // Send Email
            await sendPasswordResetEmail(email, tempPassword);

            // Create log
            await createLog('Forgot Password', user.id, 'Authentication', `Reset password for ${email}`);

            return {
                data: {},
                message: "A new password has been sent to your email address.",
                success: true
            }
        } else {
            // Emulate success to prevent user enumeration
            // But user might want to know if it failed?
            // "the email entered ... has to receive a random password"
            // If email is wrong, they won't receive it.
            // Returning success is safer.
            return {
                data: {},
                message: "If an account exists for this email, a new password has been sent.",
                success: true
            }
        }
    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);

        return {
            data: {},
            message: 'Server error. Please try again later',
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

const createRandomString = (length: number) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}