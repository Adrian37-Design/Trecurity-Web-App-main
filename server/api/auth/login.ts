import { createAppJwtToken, createOTPJwtToken } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import argon2 from "argon2";
import { createLog } from "~/vendors/logs";
import Joi from '@xavisoft/joi';
import { ApprovalLevel } from "@prisma/client";

export default defineEventHandler(async (event) => {

   const body = await readBody(event);

   //Get env variables
   const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
   const JWT_OTP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_OTP_TOKEN_SECRET;

   // Validate input
   const schema = {
      email: Joi.string().email().required(),
      password: Joi.string().required(),
      device_information: Joi.any().required(),
      recaptcha_token: Joi.string().allow('')
   }

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

   //Desctruct body
   const { email, password, device_information, recaptcha_token } = body;

   // Verify Recaptcha
   if (process.env.NODE_ENV === 'production') {
      const RECAPTCHA_SERVER_SITE_KEY = process.env.NUXT_RECAPTCHA_SERVER_SITE_KEY;
      const verify = await verifyGoogleRecaptcha(recaptcha_token, RECAPTCHA_SERVER_SITE_KEY);

      if (!verify.success || verify.score === 0 || !verify.hostname.includes('trecurity.com')) {
         return {
            data: {},
            message: "Verification Failed. Please try again later.",
            success: false
         }
      }
   }

   // check access
   /// fetch user
   const user = await prisma.user.findFirst({
      where: {
         email
      }
   });

   if (!user) {

      setResponseStatus(event, 400);

      return {
         data: {},
         message: 'Incorrect login credentials!',
         success: false
      }
   }

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

   if (!isPasswordValid) {
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

      setResponseStatus(event, 400);

      return {
         data: {},
         message: 'Incorrect login credentials!',
         success: false
      }
   }

   // reset failed login attempts number
   if (user.login_failed_attempts > 0) {
      await prisma.user.update({
         where: {
            email
         },
         data: {
            login_failed_attempts: 0
         }
      });
   }

   if (user.two_factor_auth) {
      // Created log
      createLog('Login', user.id, 'Authentication', 'Two factor authenticated log in initiated');
      const token = await createOTPJwtToken(JWT_OTP_TOKEN_SECRET);

      return {
         data: {},
         message: "",
         token,
         open_two_factor_auth: true,
         go_straight_to_dashboard: false,
         success: true
      }
   }

   // Created Log
   createLog('Login', user.id, 'Authentication', 'Failed to login');

   // set JWT cookie
   let companyId: string;
   const { approval_level } = user;

   if (approval_level === ApprovalLevel.COMPANY_ADMIN)
      companyId = user.company_where_user_is_admin_id;
   else if (approval_level === ApprovalLevel.USER)
      companyId = user.company_where_user_is_customer_id;


   const token = await createAppJwtToken(JWT_APP_TOKEN_SECRET, user.id, approval_level, companyId);
   setCookie(event, "token", token);

   // save login info
   const lastLoginIpAddress = event.node.req.socket.remoteAddress ? event.node.req.socket.remoteAddress : event.node.req.headers['x-forwarded-for'].toString();

   const updatedUser = await prisma.user.update({
      where: {
         id: user.id
      },
      data: {
         login_information: {
            create: {
               ip_address: lastLoginIpAddress,
               device_information
            }
         }
      }
   });

   // respond
   delete updatedUser.password;

   return {
      data: updatedUser,
      token,
      open_two_factor_auth: false,
      go_straight_to_dashboard: false,
      success: true
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
