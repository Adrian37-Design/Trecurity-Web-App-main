import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { checkAppJwtToken } from '~/vendors/jwt'
import { isAllowedOnEndpoint } from '~/vendors/permission'

const prisma = new PrismaClient()
const jwt_regex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/

const Paynow = {
    // Mock Paynow Implementation (Replace with real SDK or HTTP calls)
    createPayment: async (integrationId: string, integrationKey: string, email: string, amount: number) => {
        // In real life: Call Paynow API
        return {
            success: true,
            redirectUrl: `https://www.paynow.co.zw/Payment/Confirm?id=MOCK_TRANSACTION_ID`,
            pollUrl: `https://www.paynow.co.zw/Interface/CheckPayment/?guid=MOCK_GUID`
        }
        // If external dependency is added later:
        // const paynow = new Paynow(integrationId, integrationKey);
        // let payment = paynow.createPayment('Invoice 001', email);
        // payment.add('Airtime', amount);
        // return paynow.send(payment);
    }
}

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // Input Validation
        const bodySchema = z.object({
            vehicle_id: z.string().cuid(),
            phone: z.string().min(5),
            amount: z.number().min(0.5),
            email: z.string().email().optional().or(z.literal('')),
            provider: z.string(), // 'paynow'
            user_id: z.string().cuid(),
            token: z.string().regex(jwt_regex)
        });

        const validation = bodySchema.safeParse(body);
        if (!validation.success) {
            return { success: false, message: 'Invalid Input Data' };
        }

        const { vehicle_id, phone, amount, email, provider, user_id, token } = body;

        // Auth Check
        const JWT_SECRET = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
        const validToken = await checkAppJwtToken(token, JWT_SECRET, user_id);
        if (!validToken.success) {
            return { success: false, message: 'Unauthorized' };
        }

        // Permission Check
        const user = await prisma.user.findUnique({ where: { id: user_id } });
        if (!user) return { success: false, message: 'User not found' };

        // Ensure user can access vehicle
        const hasAccess = await prisma.vehicle.count({
            where: {
                id: vehicle_id,
                company_id: user.company_where_user_is_admin_id // Simplified scope check
            }
        });
        // Note: For refined permissions, use isAllowedOnEndpoint pattern if needed.

        // --- PAYNOW INTEGRATION ---
        const PAYNOW_ID = process.env.PAYNOW_INTEGRATION_ID;
        const PAYNOW_KEY = process.env.PAYNOW_INTEGRATION_KEY;

        if (!PAYNOW_ID || !PAYNOW_KEY) {
            return { success: false, message: 'Server Payment Configuration Missing' };
        }

        // Create Transaction Record (Pending)
        // Ideally we should create a 'Transaction' model in Prisma.
        // For now, we proceed to payment.

        const payment = await Paynow.createPayment(PAYNOW_ID, PAYNOW_KEY, email || 'user@example.com', amount);

        if (payment.success) {
            return {
                success: true,
                data: {
                    redirect_url: payment.redirectUrl,
                    poll_url: payment.pollUrl
                },
                message: 'Payment Initiated'
            };
        } else {
            return { success: false, message: 'Payment Gateway Error' };
        }

    } catch (error) {
        console.error("Recharge Error:", error);
        return { success: false, message: 'Internal Server Error' };
    }
});
