import { prisma } from "~/prisma/db";
import { Paynow } from "paynow";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const { amount, email, company_id } = body;

        if (!amount || !email || !company_id) {
            setResponseStatus(event, 400);
            return { success: false, message: "Missing required fields" };
        }

        // Paynow Credentials
        const PAYNOW_INTEGRATION_ID = "23302";
        const PAYNOW_INTEGRATION_KEY = "2f589802-e626-43b8-8fd3-608916246737";

        const paynow = new Paynow(PAYNOW_INTEGRATION_ID, PAYNOW_INTEGRATION_KEY);

        // Set Result and Return URLs
        // TODO: Replace with actual domain in production
        paynow.resultUrl = "https://trecurity.com/api/paynow/status";
        paynow.returnUrl = "https://trecurity.com/dashboard/billing?status=return";

        // TOGGLE THIS FOR LIVE PRODUCTION
        const IS_TEST_MODE = true;

        // In Test Mode, we MUST use your merchant email.
        // In Live Mode, we use the customer's email.
        const payerEmail = IS_TEST_MODE ? "netrozim@gmail.com" : email;

        const payment = paynow.createPayment(
            `Subscription-${company_id}-${Date.now()}`,
            payerEmail
        );

        payment.add("Subscription Topup", amount);

        const response = await paynow.send(payment);

        if (response.success) {
            // Save to DB
            await prisma.subscriptionPayment.create({
                data: {
                    company_id: company_id,
                    amount: parseFloat(amount),
                    provider: "PAYNOW",
                    reference: response.pollUrl, // Storing pollURL as reference for checking status
                    poll_url: response.pollUrl,
                    status: "PENDING"
                }
            });

            return {
                success: true,
                redirect_link: response.redirectUrl,
                poll_url: response.pollUrl
            };
        } else {
            console.error("Paynow Error:", response.error);
            return { success: false, message: "Paynow Error: " + response.error };
        }

    } catch (error: any) {
        console.error("Payment Init Error:", error);
        return { success: false, message: "Server error: " + (error.message || error) };
    }
});
