
const { SignJWT } = require('jose');
const crypto = require('crypto');
const http = require('http');

// Hardcoded secret from server/middleware/auth.ts fallback
const JWT_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";
const API_URL = "http://localhost:3000/api/controller/upsert";
const NUMBER_PLATE = "XCELAV1"; // The troublesome vehicle

async function createToken() {
    const secrect = new TextEncoder().encode(JWT_SECRET.trim());
    const alg = 'HS256';

    // Simulate what checkControllerJwtToken expects
    const token = await new SignJWT({ number_plate: NUMBER_PLATE })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secrect);

    return token;
}

async function sendData(dataPayload) {
    const token = await createToken();
    const payload = JSON.stringify(dataPayload);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length,
            'Authorization': `Bearer ${token}`
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(API_URL, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`Response Status: ${res.statusCode}`);
                console.log(`Response Body: ${data}`);
                resolve(JSON.parse(data));
            });
        });

        req.on('error', (e) => {
            console.error(`Request Error: ${e.message}`);
            reject(e);
        });

        req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log(`--- SIMULATING DEVICE FOR ${NUMBER_PLATE} ---`);
    console.log(`Target: ${API_URL}`);

    // TEST 1: Engine Lock inside data array
    console.log("\n[TEST 1] Sending Engine Lock status inside data array...");
    const engineLockPayload = {
        is_engine_locked: false, // Top-level false or missing to testfallback
        ip_address: "127.0.0.1",
        signal_quality: 20,
        modem_name: "Simulated",
        modem_info: "Test Script",
        ccid: "12345",
        imei: "123456789012345",
        imsi: "123456789012345",
        operator_name: "TestOp",
        data: [{
            geofence_id: "",
            geofence_violation_state: "NO_VIOLATION",
            satellites: 8,
            hdop: 1.0,
            lat: -17.82,
            lon: 31.05,
            age: 0,
            time_from: new Date().toISOString(),
            time_to: new Date().toISOString(), // Current time
            altitude: 1500,
            course: 0,
            speed: 0,
            fuel_level: 50,
            ignition: true,
            battery_percentage: 100,
            state: "STATIONARY",
            is_engine_locked: true // HIDDEN HERE - This is what we are testing!
        }]
    };

    await sendData(engineLockPayload);
    console.log(">> Check DB now: is_engine_locked should be TRUE.");

    /*
    // OPTIONAL: Wait for user check or verify DB directly here if we import Prisma
    // But since this runs standalone, we rely on console output.
    */

    // TEST 2: No GPS Heartbeat (Old Time + Satellites=0)
    console.log("\n[TEST 2] Sending No-GPS packet with OLD timestamp...");
    const oldTime = new Date("2025-01-01T12:00:00Z").toISOString();
    const noGpsPayload = {
        is_engine_locked: true,
        ip_address: "127.0.0.1",
        signal_quality: 20,
        modem_name: "Simulated",
        modem_info: "Test Script",
        ccid: "12345",
        imei: "123456789012345",
        imsi: "123456789012345",
        operator_name: "TestOp",
        data: [{
            geofence_id: "",
            geofence_violation_state: "NO_VIOLATION",
            satellites: 0, // NO GPS
            hdop: 1.0,
            lat: 0,
            lon: 0,
            age: 0,
            time_from: oldTime,
            time_to: oldTime, // VERY OLD TIME
            altitude: 0,
            course: 0,
            speed: 0,
            fuel_level: 50,
            ignition: true,
            battery_percentage: 100,
            state: "STATIONARY"
        }]
    };

    await sendData(noGpsPayload);
    console.log(">> Check DB now: last_seen should be NOW (Server Time), not 2025.");
}

runTests().catch(console.error);
