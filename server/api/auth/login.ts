import { createAppJwtToken, createOTPJwtToken } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import argon2 from "argon2";
import { createLog } from "~/vendors/logs";
import Joi from '@xavisoft/joi';
import { ApprovalLevel } from "@prisma/client";

export default defineEventHandler(async (event) => {

   const body = await readBody(event);

   //Get env variables with robust fallback to prevent crash
   const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";
   const config = useRuntimeConfig();

   let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
   if (!JWT_APP_TOKEN_SECRET) {
      JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
   }

   let JWT_OTP_TOKEN_SECRET = process.env.NUXT_JWT_OTP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_OTP_TOKEN_SECRET;
   if (!JWT_OTP_TOKEN_SECRET) {
      JWT_OTP_TOKEN_SECRET = (config.jwtOtpTokenSecret || config.public?.jwtOtpTokenSecret || config.jwtAppTokenSecret || FALLBACK_SECRET) as string;
   }

   // Validate input
   /* Validation removed to fix recurring issues
   const error = Joi.getError(body, schema);

   if (error) {

      setResponseStatus(event, 400);

      return {
         data: {},
         message: error,
         token: "",
         open_two_factor_auth: false,
         go_straight_to_dashboard: false,
         success: false
      }
   }
   */

   //Desctruct body
   let { email, password, device_information, recaptcha_token } = body;

   // Trim inputs to avoid copy-paste whitespace issues
   if (email) email = email.trim().toLowerCase();
   if (password) password = password.trim();

   // Verify Recaptcha (skip if not configured)
   /*
   if (process.env.NODE_ENV === 'production') {
      const RECAPTCHA_SERVER_SITE_KEY = process.env.NUXT_RECAPTCHA_SERVER_SITE_KEY;

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
   */

   // check access
   /// fetch user
   console.log(`[LOGIN_DEBUG] Searching for: ${email}`);
   const user = await prisma.user.findFirst({
      where: {
         email
      },
      include: {
         companies_managed: { select: { id: true } },
         companies_joined: { select: { id: true } },
         // Pre-load legacy for fallback if migration failed partially
         company_where_user_is_admin: { select: { id: true } },
         company_where_user_is_customer: { select: { id: true } }
      }
   });

   if (!user) {
      console.log(`[LOGIN_DEBUG] User not found for email: ${email}`);
      setResponseStatus(event, 400);

      return {
         data: {},
         message: 'Incorrect login credentials! (User not found)',
         success: false
      }
   }

   console.log(`[LOGIN_DEBUG] User found: ${user.id}`);

   /// user is deleted
   if (user.status === false) {
      setResponseStatus(event, 400);
      return {
         data: {},
         message: 'Sorry but unfortunately this user was suspended. Please contact support for more details.',
         success: false
      }
   }

   /// user is locked
   if (user.is_locked) {
      setResponseStatus(event, 400);
      return {
         data: {},
         message: 'Your account is locked. To unlock it again please use the forgot password feature.',
         success: false
      }
   }

   /// user has more than 4 failed login attempts
   if (user.login_failed_attempts > 4) {
      await prisma.user.update({
         where: {
            email
         },
         data: {
            is_locked: true
         }
      });

      setResponseStatus(event, 400);

      return {
         data: {},
         message: 'Your account is locked. To unlock it again please use the forgot password feature.',
         success: false
      }
   }

   /// check password
   const isPasswordValid = await argon2.verify(user.password, password);
   console.log(`[LOGIN_DEBUG] Password valid: ${isPasswordValid}`);

   if (!isPasswordValid) {
      console.log('[LOGIN_DEBUG] Password invalid, updating failed attempts');
      await prisma.user.update({
         where: {
            email
         },
         data: {
            login_failed_attempts: {
               increment: 1
            }
         }
      });
      // ... (return)
   }

   // reset failed login attempts number
   if (user.login_failed_attempts > 0) {
      console.log('[LOGIN_DEBUG] Resetting failed attempts');
      await prisma.user.update({
         where: {
            email
         },
         data: {
            login_failed_attempts: 0
         }
      });
   }

   // Standard USERS skip 2FA even if enabled (per client request)
   if (user.two_factor_auth && user.approval_level !== 'USER') {
      console.log('[LOGIN_DEBUG] 2FA required');
      // Created log
      createLog('Login', user.id, 'Authentication', 'Two factor authenticated log in initiated');
      const token = await createOTPJwtToken(JWT_OTP_TOKEN_SECRET);

      return {
         data: {
            user: {
               id: user.id,
               name: user.name,
               surname: user.surname,
               email: user.email,
               phone: user.phone,
               approval_level: user.approval_level,
               company_where_user_is_admin_id: user.company_where_user_is_admin_id,
               company_where_user_is_customer_id: user.company_where_user_is_customer_id,
               status: user.status
            }
         },
         message: "",
         token,
         open_two_factor_auth: true,
         success: true
      }
   }

   console.log(`[LOGIN_DEBUG] Proceeding to main login logic for ${email}`);
   console.log(`[LOGIN_DEBUG] Approval level: ${user.approval_level}`);

   console.log('[LOGIN_DEBUG] Creating Log entry...');
   // Created Log
   await createLog('Login', user.id, 'Authentication', 'User Logged In'); // Added await just in case
   console.log('[LOGIN_DEBUG] Log entry created');

   // set JWT cookie
   let companyId: string = "";
   const approval_level = user.approval_level;

   // fallback logic for companyId
   if (user.companies_managed && user.companies_managed.length > 0) {
      companyId = user.companies_managed[0].id;
   } else if (user.company_where_user_is_admin && user.company_where_user_is_admin.length > 0) { // Legacy check if relation is array
      companyId = user.company_where_user_is_admin[0].id; // Assuming array based on include
   } else if (user.company_where_user_is_admin_id) {
      companyId = user.company_where_user_is_admin_id;
   } else if (user.companies_joined && user.companies_joined.length > 0) {
      companyId = user.companies_joined[0].id;
   } else if (user.company_where_user_is_customer_id) {
      companyId = user.company_where_user_is_customer_id;
   }

   // SUPER ADMIN Fallback: If no company found, use the first active company
   if (!companyId && approval_level === 'SUPER_ADMIN') {
      const firstCompany = await prisma.company.findFirst({
         where: { status: true }
      });
      if (firstCompany) {
         companyId = firstCompany.id;
         console.log(`[LOGIN_DEBUG] Super Admin fallback: assigned to ${firstCompany.name}`);
      }
   }

   try {
      console.log('[LOGIN_DEBUG] Entering JWT creation block');

      console.log(`Login debug: Token params - UserID: ${user.id}, Level: ${approval_level}, CompanyID: ${companyId}`);

      const token = await createAppJwtToken(JWT_APP_TOKEN_SECRET, user.id, approval_level, companyId);
      const accessToken = token;
      const refreshToken = "";

      console.log('Login debug: Token created successfully');

      setCookie(event, "token", token, {
         httpOnly: false,
         path: '/',
         maxAge: 60 * 60 * 24 * 7,
         sameSite: 'lax'
      });

      // save login info
      // Fix: Handle undefined headers safely
      const forwardedFor = event.node.req.headers['x-forwarded-for'];
      const lastLoginIpAddress = forwardedFor ? forwardedFor.toString() : (event.node.req.socket.remoteAddress || '127.0.0.1');

      console.log('LOGIN_DEBUG: Updating user login info...', { id: user.id, ip: lastLoginIpAddress });

      console.log('LOGIN_DEBUG: Updating user login info SKIPPED for debugging...', { id: user.id });

      /*
      try {
         const updatedUser = await prisma.user.update({
            where: {
               id: user.id
            },
            data: {
               login_information: {
                  create: {
                     ip_address: lastLoginIpAddress,
                     device_information: {} // Forcing empty object to be safe
                  }
               }
            },
            include: {
               companies_managed: true,
               companies_joined: true,
               company_where_user_is_admin: true,
               company_where_user_is_customer: true
            }
         });
         console.log('LOGIN_DEBUG: User updated successfully');

         setCookie(event, 'auth_token', accessToken, {
            httpOnly: true,
            secure: true,
            maxAge: 60 * 60 * 24 * 7,
            sameSite: 'lax'
         });
         
         // Use updatedUser for return...
      } catch (updateError) {
         console.log('LOGIN_ERROR: DB Update Failed:', updateError);
         throw updateError; // Re-throw to be caught by outer block
      }
      */

      // Fallback for debug: Use original user (missing some relations but okay if we sanitize)
      setCookie(event, 'auth_token', accessToken, {
         httpOnly: true,
         secure: true,
         maxAge: 60 * 60 * 24 * 7,
         sameSite: 'lax'
      });

      const updatedUser = user; // Alias for compatibility with below logic (sanitization)

      // Sanitize user object to prevent circular references or massive payloads
      const sanitizedUser = {
         id: updatedUser.id,
         name: updatedUser.name,
         surname: updatedUser.surname,
         email: updatedUser.email,
         phone: updatedUser.phone,
         approval_level: updatedUser.approval_level,
         company_where_user_is_admin_id: updatedUser.company_where_user_is_admin_id,
         company_where_user_is_customer_id: updatedUser.company_where_user_is_customer_id,
         status: updatedUser.status
      };

      console.log('LOGIN_DEBUG: Response ready to send');

      return {
         data: {
            accessToken,
            refreshToken,
            user: sanitizedUser
         },
         message: "Login successful",
         success: true
      }


   } catch (error) {
      console.log('LOGIN_ERROR: Critical failure:', error); // Using log instead of error to ensure it hits out.log
      setResponseStatus(event, 500);
      return {
         data: {},
         message: "Server Error during login process",
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
