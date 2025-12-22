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
            email: z.string().email(), 
            phone: z.string(), 
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        // Destruct body
        const { user_id, company_id, name, email, phone, physical_address, website, status, initial_admin_name, initial_admin_surname, initial_admin_email, initial_admin_phone, token } = body;

        const validateBody = bodySchema.safeParse(body);
        
        //Get env variables
        const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if(!validateBody.success) {
            setResponseStatus(event, 401)

            return { data: {}, message: 'Input is in the wrong format', success: false }
        }

        if(!validateToken.success) {
            setResponseStatus(event, 401)

            return { data: {}, message: 'Session is invalid', success: false }
        }

        // Check if this user has access to this endpoint
        if(!await isAllowedOnEndpoint('SUPER_ADMIN', company_id, user_id)) return { data: {}, message: 'User does not have permission', success: false }

        // Create new company 
        if(!company_id) {
            // Check if the company email already exists
            const _company = await prisma.company.count({
                where: {
                    email
                }
            })

            if(_company > 0) return { data: {}, message: "The email address that you entered for this company already exists with another company.", success: false }

            // Check if initial_admin_user already exists
            const users = await prisma.user.count({
                where: {
                    email: initial_admin_email
                }
            })

            if(users > 0) return { data: {}, message: "The email address that you entered for this initial admin already exists with another user.", success: false }

            // Generate a random password
            const password = createRandomString(16)
            const hash = await argon2.hash(password);

            // Console log the user password when Node env is in development
            if(process.env.NODE_ENV === 'development') console.log(`Password: ${ password }`)

            const company = await prisma.company.create({
                data: {
                    name, 
                    email,
                    phone,
                    physical_address,
                    website,
                    admins: {
                        create: {
                            name: initial_admin_name,
                            surname: initial_admin_surname,
                            password: hash,
                            email: initial_admin_email,
                            phone: initial_admin_phone,
                            approval_level: 'COMPANY_ADMIN'
                        }
                    }
                }
            })

            // Send email to user with the new login credentials
            await sendWelcomeMessage(initial_admin_email, `${ initial_admin_name } ${ initial_admin_surname }`, initial_admin_email, password)

            // Created log
            createLog('Create', user_id, 'Company', `Created company ${ name } (${ company.id })`)

            return {
                data: company,
                message: "",
                success: true
            }
        }
        // Update Company
        else {
            const company = await prisma.company.update({
                where: {
                    id: company_id
                },
                data: {
                    name,
                    email,
                    phone,
                    physical_address,
                    website,
                    status
                }
            })

            // Created log
            createLog('Update', user_id, 'Company', `Updated company ${ name } (${ company.id })`)

            return {
                data: company,
                message: "",
                success: true
            }
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