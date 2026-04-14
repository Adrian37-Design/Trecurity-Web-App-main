
const { Paynow } = require('paynow');

async function testPaynow() {
    console.log("Starting Paynow Test...");

    // Credentials from server/api/paynow/initiate.post.ts
    const PAYNOW_INTEGRATION_ID = "23302";
    const PAYNOW_INTEGRATION_KEY = "2f589802-e626-43b8-8fd3-608916246737";

    const paynow = new Paynow(PAYNOW_INTEGRATION_ID, PAYNOW_INTEGRATION_KEY);

    paynow.resultUrl = "https://trecurity.com/api/paynow/status";
    paynow.returnUrl = "https://trecurity.com/dashboard/billing?status=return";

    const payment = paynow.createPayment(
        `Test-Ref-${Date.now()}`,
        "adriankwaramba@gmail.com" // Test email
    );

    payment.add("Test Item", 1.00);

    try {
        console.log("Sending payment request...");
        const fs = require('fs');
        fs.writeFileSync('paynow_response.json', JSON.stringify(response, null, 2));
        console.log("Response written to paynow_response.json");
    } catch (error) {
        console.error("Caught Error:", error);
        const fs = require('fs');
        fs.writeFileSync('paynow_response.json', JSON.stringify(error, null, 2));
    }
}

testPaynow();
