
import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
    try {
       
        // auth
        const number_plate: string = event.context.vehicle?.number_plate;

        if (!number_plate) {
            setResponseStatus(event, 401)
            return { data: {}, message: "Unauthorized", success: false }
        }
        
        // Check if vehicle exists
        const vehicles = await prisma.vehicle.count({
            where: {
                number_plate: number_plate?.toUpperCase()
            }
        })

        if(vehicles === 0) {
            setResponseStatus(event, 400)

            return { data: {}, message: "", success: false }
        }

        const controller_commands = await prisma.controllerCommand.findMany({
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
        });

        // Make these command as having been executed
        await Promise.all([
            ...controller_commands.map(({ id }) => {
                return prisma.controllerCommand.update({
                    where: {
                        id
                    },
                    data: {
                        is_executed: true
                    }
                })
            })
        ]);

        return {
            data: { controller_commands },
            message: "",
            success: true
        }
    }
    catch(error) {
        console.error(error)
        
        setResponseStatus(event, 500)

        return {
            data: {},
            message: error,
            success: false
        }
    }
})
