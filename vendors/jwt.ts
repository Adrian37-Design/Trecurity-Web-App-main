import * as jose from 'jose';
import crypto from 'crypto';
import type { ApprovalLevel } from '@prisma/client';

export const jwt_regex = /^(?:[\w-]*\.){2}[\w-]*$/;

export const createAppJwtToken = async (jwt_secret: string, user_id: string, approval_level: ApprovalLevel, company_id?: string) => {
    // Fix: Force trim whitespace to prevent signature mismatches
    const secret = new TextEncoder().encode(jwt_secret.trim());

    const alg = 'HS256';

    const token = await new jose.SignJWT({ user_id, success: true, approval_level, company_id })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setIssuer('iss.trecurity.com')
        .setAudience('aud.trecurity.com')
        .setExpirationTime('14d')
        .sign(secret);

    return token
}

export const checkAppJwtToken = async (token: string, jwt_secret: string, user_id?: string) => {
    try {
        // Fix: Force trim whitespace to prevent signature mismatches system-wide
        const secretString = jwt_secret || '';
        const secret = new TextEncoder().encode(secretString.trim());

        const { payload } = await jose.jwtVerify(token, secret, {
            // issuer: 'iss.trecurity.com',
            // audience: 'aud.trecurity.com',
        });

        if (user_id) {
            if (payload.user_id !== user_id)
                return { success: false }
        }

        // TODO: check if token is expired

        return payload
    }
    catch (error) {
        console.error("DEBUG: App JWT Verify Error:", error.message);
        console.error("DEBUG: App JWT Verify Stack:", error.stack);
        return { success: false }
    }
}

export const createOTPJwtToken = async (jwt_secret: string) => {
    const secret = new TextEncoder().encode(jwt_secret.trim());

    const alg = 'HS256';

    const token = await new jose.SignJWT({ success: true })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setIssuer('iss.trecurity.com')
        .setAudience('aud.trecurity.com')
        .setExpirationTime('30m')
        .sign(secret);

    return token
}

export const checkOTPJwtToken = async (token: string, jwt_secret: string) => {
    try {
        const secret = new TextEncoder().encode(jwt_secret.trim());

        const { payload } = await jose.jwtVerify(token, secret, {
            issuer: 'iss.trecurity.com',
            audience: 'aud.trecurity.com',
        });

        return payload;
    }
    catch (error) {
        return { success: false }
    }
}

export const createDummyJwtToken = async () => {
    const jwt_secret = crypto.randomBytes(256).toString('base64')
    const secret = new TextEncoder().encode(jwt_secret);

    const alg = 'HS256';

    const token = await new jose.SignJWT({ success: true })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setIssuer('iss.trecurity.com')
        .setAudience('aud.trecurity.com')
        .setExpirationTime('30m')
        .sign(secret);

    return token
}

export const checkControllerJwtToken = async (token: string, jwt_secret: string) => {
    try {
        const secret = new TextEncoder().encode(jwt_secret.trim());
        const { payload } = await jose.jwtVerify(token, secret);
        return payload;
    }
    catch (error) {
        console.error("DEBUG: JWT UTF8 Verify Error:", error.message);

        // Fallback: Try verifying as Hex-decoded binary
        try {
            const secretHex = new Uint8Array(Buffer.from(jwt_secret, 'hex'));
            const { payload } = await jose.jwtVerify(token, secretHex);
            console.log("DEBUG: JWT Hex Verify Success");
            return payload;
        } catch (err2) {
            console.error("DEBUG: JWT Hex Verify Error:", err2.message);
        }

        return null
    }
}
