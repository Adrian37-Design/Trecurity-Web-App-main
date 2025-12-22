import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { z } from "zod";
import { isAllowedOnEndpoint } from '~/vendors/permission';

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // Validate input
        const bodySchema = z.object({ 
            number_plate: z.string(),
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        // Destruct body
        let { number_plate, user_id, token } = body;
 
        const validateBody = bodySchema.safeParse(body);

        //Get env variables
        const JWT_APP_TOKEN_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        const validateToken = await checkAppJwtToken(token, JWT_APP_TOKEN_SECRET, user_id);

        if(!validateBody.success) {
            setResponseStatus(event, 401)

            return { data: 0, message: 'Input is in the wrong format', success: false }
        }

        if(!validateToken.success) {
            setResponseStatus(event, 401)

            return { data: 0, message: 'Session is invalid', success: false }
        }

        // Check if vehicle exists
        const vehicles = await prisma.vehicle.count({
            where: {
                number_plate: number_plate?.toUpperCase()
            }
        })

        if(vehicles === 0) {
            setResponseStatus(event, 400)

            return { data: 0, message: "", success: false }
        }

        // Get company ID from the User's data
        const user = await prisma.user.findUnique({
            where: {
                id: user_id
            }
        })

        const company_id = user.company_where_user_is_admin_id

        // Check if this user has access to this endpoint
        if(!await prisma.vehicle.count({ where: {
            AND: [
                { number_plate },
                { user: { some: { id: user_id } } }
            ]
        }}) && !await isAllowedOnEndpoint('COMPANY_ADMIN', company_id, user_id) && !await isAllowedOnEndpoint('SUPER_ADMIN', null, user_id)) return { data: 0, message: 'User does not have permission', success: false }

        const pending_commands = await prisma.controllerCommand.count({
            where: {
                AND: [
                    {
                        vehicle: {
                            number_plate
                        }
                    },
                    {
                        is_executed: false
                    }
                ]
            }
        })
        return {
            data: pending_commands,
            message: "",
            success: true
        }
    }
    catch(error) {
        console.error(error)
        
        setResponseStatus(event, 500)

        return {
            data: 0,
            message: error,
            success: false
        }
    }
})

const cosineDistanceBetweenPoints = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const deltaP = p2 - p1;
    const deltaLon = lon2 - lon1;
    const deltaLambda = (deltaLon * Math.PI) / 180;
    const a = Math.sin(deltaP/2) * Math.sin(deltaP/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R;
    return d;
  }