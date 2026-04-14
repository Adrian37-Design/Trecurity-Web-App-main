
import { SignJWT } from 'jose';

const secretHex = 'bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318';
const secret = new TextEncoder().encode(secretHex);  // Try UTF8 first as per auth.ts default

async function run() {
    console.log("Generating Token...");
    const token = await new SignJWT({ number_plate: "TEST-PROBE" })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('iss.trecurity.com')
        .setAudience('aud.trecurity.com')
        .setExpirationTime('1h')
        .sign(secret);

    console.log("Token generated. Length:", token.length);

    const payload = {
        is_engine_locked: false,
        ip_address: "127.0.0.1",
        signal_quality: 100,
        modem_name: "TestModem",
        modem_info: "TestInfo",
        ccid: "89000000000000000000",
        imei: "350000000000000",
        imsi: "350000000000000",
        operator_name: "TestOp",
        data: [{
            geofence_id: "",
            geofence_violation_state: "",
            satellites: 10,
            hdop: 1.0,
            lat: -19.0,
            lon: 30.0,
            age: 0,
            time_from: new Date().toISOString(),
            time_to: new Date().toISOString(),
            altitude: 100,
            course: 0,
            speed: 50,
            fuel_level: 80,
            ignition: true,
            battery_percentage: 100,
            mileage: 1000,
            state: "MOVING"
        }]
    };

    console.log("Sending Request to http://173.212.196.228/api/controller/upsert...");

    try {
        const res = await fetch('http://173.212.196.228/api/controller/upsert', {
            method: 'POST',
            headers: {
                'Cookie': `token=${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log("Status:", res.status);
        const txt = await res.text();
        console.log("Response:", txt);
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

run();
