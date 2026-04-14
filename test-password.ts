
import argon2 from 'argon2';

const createRandomString = (length: number) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const test = async () => {
    console.log("Testing password hashing...");

    // 1. Generate password
    const password = createRandomString(16);
    console.log(`Generated Password: '${password}'`);

    // 2. Hash it
    const hash = await argon2.hash(password);
    console.log(`Hash: ${hash}`);

    // 3. Verify it
    const verify = await argon2.verify(hash, password);
    console.log(`Verification Result: ${verify}`);

    if (verify) {
        console.log("✅ SUCCESS: Password verified correctly.");
    } else {
        console.error("❌ FAILURE: Password verification failed!");
    }
}

test();
