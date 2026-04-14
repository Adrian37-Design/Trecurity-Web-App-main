import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import argon2 from "argon2";
import { createLog } from "~/vendors/logs";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        //Get env variables
        const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;

        // Validate input
        const bodySchema = z.object({
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex),
            one_time_pin: z.string().length(6)
        });

        // Desctruct body
        let { user_id, email, one_time_pin, token, device_information } = body;
        const validateBody = bodySchema.safeParse(body);

        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if(validateBody.success && validateToken.success){
            let otp_list = await prisma.oneTimePin.findMany({
                where: {
                    AND: [
                        {
                            email
                        },
                        {
                            expires_at: {
                                gte: new Date()
                            }
                        }
                    ]
                },
                orderBy: {
                    created_at: "desc"
                },
                take: 1
            })
            .catch(error => {
                console.error(error);

                return []
            });

            if(otp_list.length === 0){
                return {
                    message: "The OTP has expired. Create a new one.",
                    success: false
                }
            }else {
                let { id, pin, failed_attempts, has_been_used } = otp_list?.at(0);

                if(has_been_used || failed_attempts >= 5){
                    // Created log
                    const user = await prisma.user.findUnique({
                        where: {
                            email
                        }
                    })

                    createLog('Account', user.id, 'Account Management', 'Account deletion has failed')

                    return {
                        message: "The OTP is now invalid. Create a new one.",
                        success: false
                    }
                }
                else {
                    let validate = await argon2.verify(pin, one_time_pin);
                    
                    if(validate){
                        await prisma.oneTimePin.update({
                            where: {
                                id
                            },
                            data: {
                                has_been_used: true
                            }
                        })

                        //Store his last Login IP Address and time
                        const lastLoginIpAddress = event.node.req.socket.remoteAddress ? event.node.req.socket.remoteAddress : event.node.req.headers['x-forwarded-for'].toString();

                        let user = await prisma.user.findUnique({
                            where: {
                                email
                            }
                        })
            
                        await prisma.user.update({
                            where: {
                                email: email
                            }, 
                            data: {
                                login_information: {
                                    create: {
                                        ip_address: lastLoginIpAddress,
                                        device_information
                                    }
                                },
                                is_locked: true,
                                status: false,
                                email: await deletedEmail(email)
                            }
                        }); 

                        // Create log
                        createLog('Account', user.id, 'Account Management', 'Successfully deleted user account')

                        return {
                            message: "Account deletion was successful",
                            success: true
                        }
                    }else {
                        failed_attempts += 1;
                        
                        try{
                            await prisma.oneTimePin.update({
                                where: {
                                    id
                                },
                                data: {
                                    failed_attempts
                                }
                            });
                        }
                        catch(error)  {
                            console.error(error);

                            return {
                                message: "Server error. Please try again later",
                                success: false
                            }
                        }

                        // Created log
                        const user = await prisma.user.findUnique({
                            where: {
                                email
                            }
                        })

                        createLog('Account', user.id, 'Account Management', 'Account deletion has failed')
                        
                        return {
                            message: "The OTP is incorrect. Please check and try again.",
                            success: false
                        }
                    }
                }
            }
        } else {
            return {
                message: 'The data is incomplete. Please check and try again.',
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

const deletedEmail = async (email:any) => {
    let my_stamp = new Date().getTime();
   return email + "_DELETED_" + my_stamp
}