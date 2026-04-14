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
            name: z.string().min(1, "Company name is required"),
            email: z.string().email("Please provide a valid company email address"),
            phone: z.string().min(1, "Company phone number is required"),
            initial_admin_name: z.string().min(1, "Initial admin name is required"),
            initial_admin_surname: z.string().min(1, "Initial admin surname is required"),
            initial_admin_email: z.string().email("Please provide a valid initial admin email address"),
            initial_admin_phone: z.string().min(1, "Initial admin phone number is required"),
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        const validateBody = bodySchema.safeParse(body);

        if (!validateBody.success) {
            console.error("Company Upsert Validation Error:", validateBody.error.format());
            setResponseStatus(event, 400);

            const errorMessages = validateBody.error.issues.map(err => err.message).join(", ");
            return { data: {}, message: errorMessages, success: false };
        }

        // Destruct body AFTER validation
        const { user_id, company_id, name, email, phone, physical_address, website, status, initial_admin_name, initial_admin_surname, initial_admin_email, initial_admin_phone, token } = body;

        //Get env variables
        const config = useRuntimeConfig();
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateToken.success) {
            setResponseStatus(event, 401)

            return { data: {}, message: 'Session is invalid', success: false }
        }

        // Check if this user has access to this endpoint
        // SUPER_ADMIN can update any company, COMPANY_ADMIN can only update their own
        const isSuperAdmin = await isAllowedOnEndpoint('SUPER_ADMIN', company_id, user_id);
        const isCompanyAdmin = company_id ? await isAllowedOnEndpoint('COMPANY_ADMIN', company_id, user_id) : false;

        if (!isSuperAdmin && !isCompanyAdmin) {
            return { data: {}, message: 'User does not have permission', success: false };
        }

        // Create new company 
        if (!company_id) {
            // Check if the company email already exists
            const _company = await prisma.company.count({
                where: {
                    email
                }
            })

            if (_company > 0) return { data: {}, message: "The email address that you entered for this company already exists with another company.", success: false }

            // Check if initial_admin_user already exists
            const users = await prisma.user.count({
                where: {
                    email: initial_admin_email
                }
            })

            if (users > 0) return { data: {}, message: "The email address that you entered for this initial admin already exists with another user.", success: false }

            // Generate a random password
            const password = createRandomString(16)
            const hash = await argon2.hash(password);

            // Console log the user password when Node env is in development
            if (process.env.NODE_ENV === 'development') console.log(`Password: ${password}`)

            // Fetch Current User to determine parent/type
            const currentUser = await prisma.user.findUnique({ where: { id: user_id } });
            const isMaster = currentUser?.approval_level === 'MASTER_ADMIN';
            const isSuper = currentUser?.approval_level === 'SUPER_ADMIN';

            let parent_company_id = null;
            let type: 'CLIENT' | 'RESELLER' | 'PLATFORM' = 'CLIENT';

            if (isSuper) {
                // Super Admin creating a Client
                parent_company_id = currentUser?.company_where_user_is_admin_id;
                type = 'CLIENT';
            } else if (isMaster) {
                // Master Admin creating a Reseller
                type = 'RESELLER';
                // No parent (or self?)
            }

            const company = await prisma.company.create({
                data: {
                    name,
                    email,
                    phone,
                    physical_address,
                    website,
                    type,
                    parent_company_id,
                    admins: {
                        create: {
                            name: initial_admin_name,
                            surname: initial_admin_surname,
                            password: hash,
                            email: initial_admin_email,
                            phone: initial_admin_phone,
                            approval_level: 'COMPANY_ADMIN'
                        },
                        connect: { id: user_id }
                    }
                }
            })

            // Send email to user with the new login credentials
            await sendWelcomeMessage(initial_admin_email, `${initial_admin_name} ${initial_admin_surname}`, initial_admin_email, password)

            // Created log
            createLog('Create', user_id, 'Company', `Created company ${name} (${company.id})`)

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

            // Cascade status to all associated users (except SUPER_ADMIN)
            if (status !== undefined) {
                // Update all admins (except SUPER_ADMIN)
                const adminsUpdated = await prisma.user.updateMany({
                    where: {
                        company_where_user_is_admin_id: company_id,
                        approval_level: { not: 'SUPER_ADMIN' }
                    },
                    data: { status }
                });

                // Update all customers
                const customersUpdated = await prisma.user.updateMany({
                    where: {
                        company_where_user_is_customer_id: company_id
                    },
                    data: { status }
                });

                // Log cascading status change
                const totalUsersUpdated = adminsUpdated.count + customersUpdated.count;
                if (totalUsersUpdated > 0) {
                    await createLog('Update', user_id, 'Company', `Updated company ${name} status to ${status ? 'enabled' : 'disabled'} - cascaded to ${totalUsersUpdated} user(s)`);
                } else {
                    await createLog('Update', user_id, 'Company', `Updated company ${name} (${company.id})`);
                }
            } else {
                // Created log
                await createLog('Update', user_id, 'Company', `Updated company ${name} (${company.id})`)
            }

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
            message: "Server Error: " + error.message,
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