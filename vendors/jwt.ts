import * as jose from 'jose';
import crypto from 'crypto';
import type { ApprovalLevel } from '@prisma/client';

export const jwt_regex = /^(?:[\w-]*\.){2}[\w-]*$/;

export const createAppJwtToken = async (jwt_secret: string, user_id: string, approval_level: ApprovalLevel, company_id?: string) => {
    const secret = new TextEncoder().encode(jwt_secret);

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
        const secret = new TextEncoder().encode(jwt_secret);

        const { payload } = await jose.jwtVerify(token, secret, {
            issuer: 'iss.trecurity.com',
            audience: 'aud.trecurity.com',
        });

        if (user_id) {
            if (payload.user_id !== user_id)
                return { success: false }
        }

        // TODO: check if token is expired

        return payload
    }
    catch (error) {
        return { success: false }
    }
}

export const createOTPJwtToken = async (jwt_secret: string) => {
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

export const checkOTPJwtToken = async (token: string, jwt_secret: string) => {
    try {
        const secret = new TextEncoder().encode(jwt_secret);

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
        const secret = new TextEncoder().encode(jwt_secret);
        const { payload } = await jose.jwtVerify(token, secret);
        return payload;
    }
    catch (error) {
        return null
    }
}
