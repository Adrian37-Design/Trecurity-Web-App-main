import { prisma } from "~/prisma/db"
import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt"
import { z } from "zod"

export default defineEventHandler(async (event)=>{
    try {
        const body = await readBody(event)

        //Validate input
        const bodySchema = z.object({
            token: z.string().regex(jwt_regex)
        })

        const validateBody = bodySchema.safeParse(body)

        if(!validateBody.success) {
            return {
                data: {},
                message: 'Input is in the wrong format',
                success: false
            }
        }

        //Desctruct body
        const { user_id, token } = body

        const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;

        const is_valid = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id).then(({ success })=> success )

        if(user_id) {
            try {
                await prisma.user.update({
                    where: {
                        id: user_id
                    },
                    data: {
                        last_seen_at: new Date()
                    }
                })
            } catch (error) {
                console.error(error)
            }
        }

        return {
            data: { is_valid },
            message: "",
            success: true
        }
   } catch (error) {
        console.error(error)
        setResponseStatus(event, 500)
        
        return { 
            data: {},
            message: 'A server error has occurred',
            success: false
        }  
   }
})
