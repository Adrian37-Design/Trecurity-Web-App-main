import { checkAppJwtToken, jwt_regex } from "~/vendors/jwt";
import { prisma } from "~/prisma/db";
import { ApprovalLevel } from "@prisma/client";

export default defineEventHandler(async (event) => {


	// auth
	const userId = event.context.user.id;
	if (!userId) {
		setResponseStatus(event, 401);
		return { message: "Unauthorized" };
	}

	// retrieve
	/// build query
	const approvalLevel = event.context.user.approval_level;
	// Retrieve fresh user data to ensure accurate company IDs (JWT might be stale/incomplete)
	const user = await prisma.user.findUnique({
		where: { id: userId }
	});

	if (!user) {
		setResponseStatus(event, 401);
		return { message: "User not found" };
	}

	const { company_where_user_is_customer_id, company_where_user_is_admin_id } = user;

	const where: any = {
		status: true,
		tracking_data: {
			some: {}
		}
	}

	const { vehicle_id } = getQuery(event);
	if (vehicle_id)
		where.id = vehicle_id;

	// Determine restricted company tracking
	let company_id = company_where_user_is_admin_id || company_where_user_is_customer_id;

	// Fallback/Deep check for Many-to-Many or context
	if (!company_id) {
		const userWithCompanies = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				companies_managed: { select: { id: true } },
				companies_joined: { select: { id: true } }
			}
		});
		
		company_id = userWithCompanies?.companies_managed?.[0]?.id || 
					 userWithCompanies?.companies_joined?.[0]?.id || 
					 (event.context.user.company_id as string);
	}

	const isMaster = approvalLevel === ApprovalLevel.MASTER_ADMIN;

	if (!isMaster) {
		if (company_id) {
			where.company_id = company_id;
		} else {
			// If not Master and no company linked, they see NOTHING.
			return { data: [] };
		}
	} else if (event.context.user.company_id) {
		// Master Admin can still filter by a specific company if they want
		where.company_id = event.context.user.company_id;
	}

	/// retrieve
	const vehicles = await prisma.vehicle.findMany({
		where,
		include: {
			user: {
				select: {
					id: true,
					name: true,
					surname: true,
				}
			},
			company: {
				select: {
					id: true,
					name: true
				}
			},
			tracking_data: {
				orderBy: {
					time_to: "desc"
				},
				take: 1
			}
		}
	});

	return {
		data: vehicles.map(vehicle => {
			const [tracking_data] = vehicle.tracking_data;
			return {
				...vehicle,
				tracking_data,
			}
		})
	}
});

