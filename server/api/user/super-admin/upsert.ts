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
            name: z.string().min(1, "Name is required"),
            surname: z.string().min(1, "Surname is required"),
            email: z.string().email("Please provide a valid email address"),
            phone: z.string().min(1, "Phone number is required"),
            approval_level: z.any(),
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        const validateBody = bodySchema.safeParse(body);

        if (!validateBody.success) {
            setResponseStatus(event, 400);

            const errorMessages = validateBody.error.issues.map(err => err.message).join(", ");
            return { data: {}, message: errorMessages, success: false };
        }

        // Destruct body AFTER validation
        const { user_id, company_where_user_is_admin_id, company_where_user_is_customer_id, update_user_id, name, surname, email, phone, password, approval_level, status, token } = body;

        //Get env variables
        const config = useRuntimeConfig();
        const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

        let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        if (!JWT_APP_TOKEN_SECRET) {
            JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
        }

        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if (!validateToken.success) {
            // Return 200 to prevent frontend refresh loop
            return { data: {}, message: 'Session is invalid (Token Check Failed)', success: false }
        }

        // Check if this user has access to this endpoint
        if (!await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { data: {}, message: 'User does not have permission', success: false }

        // Fetch Current User to determine permissions mechanism
        const currentUser = await prisma.user.findUnique({ where: { id: user_id } });
        const isMaster = currentUser?.approval_level === 'MASTER_ADMIN';

        // Prevent Super Admin from creating another Super Admin
        if (approval_level === 'SUPER_ADMIN' && !isMaster) {
            return { data: {}, message: 'You do not have permission to create a Super Admin', success: false }
        }

        // Enforce company assignment for SUPER_ADMIN
        if (approval_level === 'SUPER_ADMIN' && !company_where_user_is_admin_id) {
            return { data: {}, message: 'SUPER_ADMIN must be assigned to a company', success: false }
        }

        // Create new user
        if (!update_user_id) {
            // Check if user already exists
            let existingUser = await prisma.user.findUnique({
                where: { email }
            });

            if (existingUser) {
                // User exists - Add them to the company (Link)
                console.log(`[UPSERT] User ${email} exists. Linking to company...`);

                // Determine which relation to update based on role
                const isCompanyAdmin = approval_level === 'COMPANY_ADMIN';
                const isUser = approval_level === 'USER';
                const targetCompanyId = isCompanyAdmin ? company_where_user_is_admin_id : company_where_user_is_customer_id;

                if (!targetCompanyId) {
                    return { data: {}, message: "Target company ID is missing for linking.", success: false }
                }

                // Check if already linked
                // We can just try to connect (Prisma handles duplicates if we check schema, or we explicitly check)
                // Better to checking prevents errors

                await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        companies_managed: isCompanyAdmin && targetCompanyId ? { connect: { id: targetCompanyId } } : undefined,
                        companies_joined: isUser && targetCompanyId ? { connect: { id: targetCompanyId } } : undefined,
                        // Update legacy fields ONLY if they are currently null
                        company_where_user_is_admin_id: (isCompanyAdmin && !existingUser.company_where_user_is_admin_id) ? targetCompanyId : undefined,
                        company_where_user_is_customer_id: (isUser && !existingUser.company_where_user_is_customer_id) ? targetCompanyId : undefined
                    }
                });

                await createLog('Update', user_id, 'User', `Linked user ${existingUser.name} ${existingUser.surname} (${email}) to company ${targetCompanyId}`);

                return { data: existingUser, message: "User added to company successfully", success: true }
            }

            // User does not exist - Create NEW
            // Check if initial_admin_user already exists (redundant check if findUnique returned null above, but keeping structure?)
            // actually findUnique covers it.

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
                    // Use M-N relations for creation (SUPER_ADMIN and COMPANY_ADMIN use companies_managed)
                    companies_managed: (approval_level === 'COMPANY_ADMIN' || approval_level === 'SUPER_ADMIN') && company_where_user_is_admin_id ? { connect: { id: company_where_user_is_admin_id } } : undefined,
                    companies_joined: approval_level === 'USER' && company_where_user_is_customer_id ? { connect: { id: company_where_user_is_customer_id } } : undefined,
                    // Set legacy fields for now
                    company_where_user_is_customer_id,
                    company_where_user_is_admin_id
                }
            })

            // Send email to user with the new login credentials
            try {
                await sendWelcomeMessage(email, `${name} ${surname}`, email, password);
                console.log(`✅ User created & Email sent: ${email}`);
            } catch (emailError) {
                console.error(`⚠️ User created but Email FAILED for ${email}:`, emailError);
                // We do NOT throw here, allowing the response to return success
            }

            // Created log
            await createLog('Create', user_id, 'User', `Created user ${user.name} ${user.surname} (${user.email}) (${user.id})`)

            return { data: user, message: "User created successfully", success: true }
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

            // Fetch Current User to determine permissions
            const currentUser = await prisma.user.findUnique({ where: { id: user_id } });
            const isMaster = currentUser?.approval_level === 'MASTER_ADMIN';

            // Fetch the user being updated to check their current approval level
            const userBeingUpdated = await prisma.user.findUnique({
                where: { id: update_user_id },
                select: { approval_level: true }
            });

            // Prevent SUPER_ADMIN from editing another SUPER_ADMIN or MASTER_ADMIN
            if (!isMaster && (userBeingUpdated?.approval_level === 'SUPER_ADMIN' || userBeingUpdated?.approval_level === 'MASTER_ADMIN')) {
                return { data: {}, message: "You do not have permission to edit this user", success: false }
            }

            // Check if user is trying to UPDATE to SUPER ADMIN role
            if (approval_level === "SUPER_ADMIN" && !isMaster) return { data: {}, message: "You cannot update a user to SUPER ADMIN", success: false }

            // Prevent creating/updating to MASTER_ADMIN unless current user is MASTER_ADMIN
            if (approval_level === "MASTER_ADMIN" && !isMaster) return { data: {}, message: "Cannot assign MASTER_ADMIN role", success: false }

            let updateData: any = {
                name,
                surname,
                email,
                phone,

                approval_level,
                status,
                company_where_user_is_customer_id,
                company_where_user_is_admin_id
            };

            if (password && password.trim().length > 0) {
                updateData.password = await argon2.hash(password);
            }

            const updatedUser = await prisma.user.update({
                where: {
                    id: update_user_id
                },
                data: updateData,
                include: {
                    companies_managed: true,
                    companies_joined: true
                }
            })

            // Check if we need to cascade status to company
            if (status !== undefined && approval_level !== 'SUPER_ADMIN') {
                // ... (existing logic omitted for brevity, logic remains same but ensuring return) ...
                if (!status) {
                    await createLog('Update', user_id, 'User', `Updated user ${name} ${surname} (${email}) (${updatedUser.id})`);
                } else {
                    // User is being ENABLED - check if they're a company admin
                    const companyId = company_where_user_is_admin_id || company_where_user_is_customer_id;

                    if (companyId && approval_level === 'COMPANY_ADMIN') {
                        // Enabling a company admin - enable the entire company

                        // 1. Enable the company
                        await prisma.company.update({
                            where: { id: companyId },
                            data: { status: true }
                        });

                        // 2. Enable all admins in this company (except SUPER_ADMIN)
                        const adminsUpdated = await prisma.user.updateMany({
                            where: {
                                company_where_user_is_admin_id: companyId,
                                approval_level: { not: 'SUPER_ADMIN' },
                                id: { not: update_user_id } // Don't update the already-updated user
                            },
                            data: { status: true }
                        });

                        // 3. Enable all customers in this company
                        const customersUpdated = await prisma.user.updateMany({
                            where: {
                                company_where_user_is_customer_id: companyId
                            },
                            data: { status: true }
                        });

                        const totalUsersEnabled = adminsUpdated.count + customersUpdated.count;

                        await createLog('Update', user_id, 'User', `Enabled company admin ${name} ${surname} - enabled company and ${totalUsersEnabled} associated user(s)`);
                    } else {
                        await createLog('Update', user_id, 'User', `Updated user ${name} ${surname} (${email}) (${updatedUser.id})`);
                    }
                }
            } else {
                await createLog('Update', user_id, 'User', `Updated user ${name} ${surname} (${email}) (${updatedUser.id})`);
            }

            // Return the updated user!
            return {
                data: updatedUser,
                message: "User updated successfully",
                success: true
            }
        }
    } catch (error) {
        console.error(error);
        setResponseStatus(event, 500);

        return {
            data: {},
            message: `Server Error: ${(error as Error).message}`,
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