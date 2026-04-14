import * as jose from 'jose';
import fs from 'fs';

const secret = 'bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318';

async function generate() {
    const alg = 'HS256';
    const payload = { number_plate: "TEST-PROBE" };

    // 1. UTF-8 String Secret
    const secretUTF8 = new TextEncoder().encode(secret);
    const tokenUTF8 = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg })
        .sign(secretUTF8);

    // 2. Hex Binary Secret
    const secretHex = new Uint8Array(Buffer.from(secret, 'hex'));
    const tokenHex = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg })
        .sign(secretHex);

    const out = {
        utf8: tokenUTF8,
        hex: tokenHex
    };

    fs.writeFileSync('tokens.json', JSON.stringify(out, null, 2));
}

generate();
