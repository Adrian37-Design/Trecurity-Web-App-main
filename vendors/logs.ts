import { prisma } from "~/prisma/db";

export const createLog = async (action: string, user_id: string, section: string, change: string) => {
    try {
        await prisma.logs.create({
            data: {
                action,
                user_id,
                section,
                change
            }
        })
    } catch (error) {
        console.error(error)
    }
}