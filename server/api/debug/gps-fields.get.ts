import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
    try {
        // Get most recent tracking data with raw payload info
        const recent = await prisma.trackingData.findMany({
            take: 5,
            orderBy: { time_to: 'desc' },
            select: {
                id: true,
                time_to: true,
                vehicle_id: true,
                mileage: true,
                speed: true,
                lat: true,
                lon: true,
                battery_percentage: true,
                fuel_level: true,
                // All fields that might contain data
                altitude: true,
                course: true,
                hdop: true,
                signal_strength: true,
                satellites: true,
                ignition: true,
                age: true
            }
        });

        return {
            success: true,
            message: "Showing recent GPS data fields",
            data: {
                total_checked: recent.length,
                mileage_status: recent.some(r => r.mileage) ? "✅ FOUND" : "❌ MISSING",
                sample_records: recent.map(r => ({
                    time: r.time_to,
                    vehicle_id: r.vehicle_id,
                    has_mileage: !!r.mileage,
                    mileage_value: r.mileage,
                    other_fields: {
                        speed: r.speed,
                        battery: r.battery_percentage,
                        fuel: r.fuel_level,
                        satellites: r.satellites
                    }
                })),
                diagnosis: recent.some(r => r.mileage)
                    ? "Mileage IS being saved! Check export again."
                    : "Mileage NOT in database. GPS devices likely don't send mileage/odometer data in packets."
            }
        };

    } catch (error) {
        console.error("GPS field check error:", error);
        setResponseStatus(event, 500);
        return { success: false, message: "Error checking GPS fields", error: String(error) };
    }
});
