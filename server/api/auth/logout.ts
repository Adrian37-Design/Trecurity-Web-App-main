import { createLog } from "~/vendors/logs";
import { type User } from "@prisma/client";

export default defineEventHandler(async (event)=>{
    try {
        
        const userId: string = event.context.user?.id;

        // Created log
        createLog('Logout', userId, 'Authentication', 'Successfully logged out')
    
        // Clear cookies
        setCookie(event, "token", "");

        return {
            success: true
        }
    } catch (error) {
        console.error(error)

        return {
            success: false
        }
    }
});