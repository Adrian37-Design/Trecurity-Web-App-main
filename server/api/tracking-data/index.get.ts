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
	const { company_id } = event.context.user;

	const where: any = {
		status: true,
		tracking_data: {
			some: {}
		}
	}

	const { vehicle_id } = getQuery(event);
	if (vehicle_id)
		where.id = vehicle_id;

	if (approvalLevel === ApprovalLevel.COMPANY_ADMIN) {
		where.company_id = company_id;
	} else if (approvalLevel === ApprovalLevel.USER) {
		where.user = {
			some: {
				id: userId,
			}
		}
	} // TODO: consolidate this logic with other places (e.g. vehicles/search.get.ts)

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
					created_at: "desc"
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

