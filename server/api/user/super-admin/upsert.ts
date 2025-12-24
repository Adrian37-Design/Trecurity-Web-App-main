import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';
import argon2 from 'argon2'
import { sendWelcomeMessage } from "~/vendors/mail";
import { createLog } from "~/vendors/logs";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // Validate input
        const bodySchema = z.object({
            name: z.string(),
            surname: z.string(),
            email: z.string().email(),
            phone: z.string(),
            approval_level: z.any(),
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        // Destruct body
        const { user_id, company_where_user_is_admin_id, company_where_user_is_customer_id, update_user_id, name, surname, email, phone, approval_level, status, token } = body;

        const validateBody = bodySchema.safeParse(body);

        //Get env variables
        const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateBody.success) {
            setResponseStatus(event, 401)

            return { data: {}, message: 'Input is in the wrong format', success: false }
        }

        if (!validateToken.success) {
            setResponseStatus(event, 401)

            return { data: {}, message: 'Session is invalid', success: false }
        }

        // Check if this user has access to this endpoint
        if (!await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { data: {}, message: 'User does not have permission', success: false }

        // Create new user
        if (!update_user_id) {
            // Check if initial_admin_user already exists
            const users = await prisma.user.count({
                where: {
                    email
                }
            })

            if (users > 0) return { data: {}, message: "A user with this email address already exists", success: false }

            // Generate a random password
            const password = createRandomString(16)
            const hash = await argon2.hash(password);

            // Console log the user password when Node env is in development
            if (process.env.NODE_ENV === 'development') console.log(`Password: ${password}`)

            const user = await prisma.user.create({
                data: {
                    name,
                    surname,
                    email,
                    phone,
                    approval_level,
                    password: hash,
                    company_where_user_is_customer_id,
                    company_where_user_is_admin_id
                }
            })

            // Send email to user with the new login credentials
            // await sendWelcomeMessage(email, `${ name } ${ surname }`, email, password)
            console.log(`✅ User created: ${email} | Password: ${password}`);

            // Created log
            createLog('Create', user_id, 'User', `Created user ${user.name} ${user.surname} (${user.email}) (${user.id})`)
        } else {
            // If email is being updated, check if there is another user using it
            const user = await prisma.user.findUnique({
                where: {
                    email
                }
            })

            if (user?.email !== email) {
                const users = await prisma.user.count({
                    where: {
                        email
                    }
                })

                if (users > 0) return { data: {}, message: "A user with this email address already exists", success: false }
            }

            // Check if user is a SUPER ADMIN, if so no update can be done
            if (approval_level === "SUPER_ADMIN") return { data: {}, message: "You cannot update a SUPER ADMIN", success: false }

            const updatedUser = await prisma.user.update({
                where: {
                    id: update_user_id
                },
                data: {
                    name,
                    surname,
                    email,
                    phone,

                    approval_level,
                    status,
                    company_where_user_is_customer_id,
                    company_where_user_is_admin_id
                }
            })

            // Created log
            createLog('Update', user_id, 'User', `Updated user ${name} ${surname} (${email}) (${updatedUser.id})`)
        }

        return {
            data: {},
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


const createRandomString = (length: number) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}