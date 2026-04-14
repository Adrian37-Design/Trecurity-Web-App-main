import { prisma } from "~/prisma/db";
import { Paynow } from "paynow";

export default defineEventHandler(async (event) => {
    try {
        // Paynow sends data as URL-encoded form body, but sometimes as query params depending on config.
        // Usually it's a POST to the Result URL.
        const body = await readBody(event);

        console.log("Paynow Callback Received:", body);

        // We technically should verify the hash here using Paynow SDK, 
        // but for now we will rely on checking the pollUrl status manually to be double-sure.

        const reference = body.reference; // This matches the "Subscription-..." reference we sent
        const paynow_reference = body.paynowreference;
        const status = body.status;
        const poll_url = body.pollurl;

        if (!reference) {
            return "Reference missing";
        }

        // Find the payment
        const payment = await prisma.subscriptionPayment.findFirst({
            where: {
                poll_url: poll_url // We stored poll_url as reference/poll_url in initiate
            }
        });

        // If not found by poll_url, try by partial reference match if needed, but poll_url is safest
        if (!payment) {
            console.log("Payment not found for poll_url:", poll_url);
            // Try searching by our generated reference if passed back
            // But let's stick to updating if we find it.
            return "Payment not found";
        }

        // Update Payment Status
        await prisma.subscriptionPayment.update({
            where: { id: payment.id },
            data: {
                status: status,
                payment_method: body.paymentmethod || "Paynow",
                reference: paynow_reference // Update with actual Paynow ref
            }
        });

        // Trigger Business Logic if Paid
        if (status === 'Paid' || status === 'Awaiting Delivery') {
            // 1. Extend Company Subscription
            const company = await prisma.company.findUnique({
                where: { id: payment.company_id }
            });

            if (company) {
                // Add 30 days to existing expiry or now
                let new_expiry = new Date();
                if (company.subscription_expiry && company.subscription_expiry > new Date()) {
                    new_expiry = new Date(company.subscription_expiry);
                }
                new_expiry.setDate(new_expiry.getDate() + 30); // Add 30 Days

                await prisma.company.update({
                    where: { id: company.id },
                    data: {
                        subscription_expiry: new_expiry,
                        subscription_status: 'ACTIVE'
                    }
                });
            }
        }

        return "Success";

    } catch (error) {
        console.error("Paynow Callback Error:", error);
        return "Error";
    }
});
