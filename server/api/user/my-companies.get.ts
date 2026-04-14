
import { prisma } from "~/prisma/db";

export default defineEventHandler(async (event) => {
    try {
        const user_id = event.context.user?.id;

        if (!user_id) {
            setResponseStatus(event, 401);
            return { data: [], message: "Unauthorized", success: false };
        }

        const user = await prisma.user.findUnique({
            where: { id: user_id },
            include: {
                companies_managed: true,
                companies_joined: true
            }
        });

        if (!user) {
            setResponseStatus(event, 404);
            return { data: [], message: "User not found", success: false };
        }

        const companies = [
            ...(user.companies_managed || []),
            ...(user.companies_joined || [])
        ];

        // If no companies are associated and the user is a SUPER_ADMIN,
        // fallback to showing the first active company.
        if (companies.length === 0 && user.approval_level === 'SUPER_ADMIN') {
            const firstCompany = await prisma.company.findFirst({
                where: { status: true }
            });
            if (firstCompany) {
                companies.push(firstCompany);
            }
        }

        // Unique companies by ID
        const uniqueCompanies = Array.from(new Map(companies.map(c => [c.id, c])).values());

        return {
            data: uniqueCompanies,
            message: "Companies fetched successfully",
            success: true
        };

    } catch (error) {
        console.error("Failed to fetch companies:", error);
        return { data: [], message: "Server error", success: false };
    }
});
