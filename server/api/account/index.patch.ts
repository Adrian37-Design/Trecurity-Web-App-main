import { prisma } from "~/prisma/db";
import argon2 from "argon2";
import Joi from "@xavisoft/joi";

export default defineEventHandler(async (event) => {
    // auth
    const user_id = event.context.user?.id;

    if (!user_id) {
        setResponseStatus(event, 401);
        return {
            data: {},
            message: "Unauthorized",
            success: false
        }
    }

    // validate schema
    const body = await readBody(event);

    const schema = { 
        name: Joi.string(), 
        surname: Joi.string(),
        phone: Joi.string(), 
        two_factor_auth: Joi.boolean(),
        password: Joi.string(),
        old_password: Joi.when('password', {
            is: Joi.exist(),
            then: Joi.required(),
            otherwise: Joi.forbidden()
        })
    }

    const error = Joi.getError(body, schema);
    if (error) {
        setResponseStatus(event, 400);
        return { data: {}, message: error, success: false }
    }        

    // update
    const { old_password, name, surname, phone, two_factor_auth } = body;
    let { password } = body;

    let user = await prisma.user.findUnique({
        where: {
            id: user_id
        }
    });
    
    if (password) {
    
        const match = await argon2.verify(user.password, old_password);
    
        if (!match) {
            return {
                data: {},
                message: 'Incorrect Old Password',
                success: false
            }               
        }
        
        password = await argon2.hash(password); 
    }

    user = await prisma.user.update({
        where: { id: user_id },
        data: { name, surname, phone, two_factor_auth, password }
    });

    return {
        data: user,
        message: "",
        success: true
    }
});