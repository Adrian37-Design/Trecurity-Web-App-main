import moment from "moment"
import pLimit from "p-limit";
import nodemailer from 'nodemailer';


function getTransport() {
    let config: any = {};
    try {
        config = useRuntimeConfig();
    } catch (e) {
        console.warn("useRuntimeConfig not available, falling back to process.env");
    }

    // Check runtime config first, then environment variables
    const host = config.SMTP_HOST || process.env.NUXT_PUBLIC_SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(config.SMTP_PORT || process.env.NUXT_PUBLIC_SMTP_PORT || process.env.SMTP_PORT || '587');
    const user = config.SMTP_USER || process.env.NUXT_PUBLIC_SMTP_USER || process.env.SMTP_USER || process.env.SMTP_USERNAME;
    const pass = config.SMTP_PASSWORD || process.env.NUXT_PUBLIC_SMTP_PASSWORD || process.env.SMTP_PASSWORD;

    console.log('SMTP Config Check:', {
        host,
        port,
        hasUser: !!user,
        hasPass: !!pass,
        userSource: process.env.NUXT_PUBLIC_SMTP_USER ? 'NUXT_PUBLIC' : process.env.SMTP_USER ? 'SMTP_USER' : process.env.SMTP_USERNAME ? 'SMTP_USERNAME' : 'none'
    });

    if (!user || !pass) {
        console.warn('SMTP credentials not configured - emails will not be sent');
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        auth: { user, pass }
    });
}

interface SendOpts {
    from?: String,
    to: String,
    subject: String,
    text?: String,
    html: String
}

function send(opts: SendOpts): Promise<any> {

    const { from, to, subject, text, html } = opts;

    const transport = getTransport();
    if (!transport) {
        console.warn(`Email not sent to ${to} - SMTP not configured`);
        return Promise.resolve({ message: 'SMTP not configured' });
    }

    let config: any = {};
    try {
        config = useRuntimeConfig();
    } catch (e) {
        // Fallback
    }

    const user = config.SMTP_USER || process.env.NUXT_PUBLIC_SMTP_USER || process.env.SMTP_USER || process.env.SMTP_USERNAME;
    const fromAddress = from || process.env.NUXT_PUBLIC_SMTP_FROM || `Trecurity <${user}>`;

    return transport.sendMail({
        from: fromAddress,
        to,
        subject,
        text,
        html
    });
}

export const host = process.env.NODE_ENV === 'production' ? 'https://trecurity.com' : "http://localhost:3000";

export const app_name = "Trecurity";

export const sendOTPEmail = async (otp: string, to: string) => {

    const html = `<p>Here is your One Time Pin <strong>${otp}</strong><p>`;
    const subject = 'One Time Pin';

    await send({
        to,
        subject,
        html,
    })
        .catch(err => console.error(err));
}

export const sendWelcomeMessage = async (to: string, name: string, email: string, password: string) => {


    const html = `
        <div>
            <h4>Hi <strong>${name}</strong>
            <p>Welcome to <strong>${app_name}</strong>. Here are the temporary credentials to your new account. Please change them as soon as possible.</p>
            <p>Email: <strong>${email}</strong></p>
            <p>Password: <strong>${password}</strong></p>
            <a href="${host}/login">Trecurity Login Page</a>
        </div>
    `;

    await send({
        to,
        subject: `Welcome to the ${app_name}`,
        html,
    }).catch(err => console.error(err));
}

export const sendPasswordResetEmail = async (to: string, password: string) => {

    const html = `
        <div>
            <h4>Password Reset Request</h4>
            <p>You have requested a new password for your <strong>${app_name}</strong> account.</p>
            <p>Your new temporary password is: <strong>${password}</strong></p>
            <p>Please log in and change this password immediately.</p>
            <a href="${host}/login">Login to Trecurity</a>
        </div>
    `;

    await send({
        to,
        subject: `${app_name} - Password Reset`,
        html,
    }).catch(err => console.error(err));
}

export const sendGeofenceViolationEmail = async (recipients: any, vehicle_number_plate: string, lat: number, lon: number, time: Date, is_engine_locked: boolean) => {
    // Set promise concurrent limit
    const limit = pLimit(10);

    await Promise.all([
        ...recipients.map(recipient => {
            return limit(() => {
                const html = `<p>Your vehicle with license plate <strong>${vehicle_number_plate.toUpperCase()}</strong> violated it's geofence at <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}" target="_blank">this</a> geolocation at <strong>${moment(time).format('ddd, DD MMM yy, h:mmA')}</strong> ${is_engine_locked ? '. The engine has been locked' : ''}. For more information log into your <a href="${host}" target="_blank">Trecurity Account</a>.<p>`;

                return send({
                    to: recipient,
                    subject: 'Geofence Violation',
                    html,
                })
                    .catch(err => console.error(err));

            })
        })
    ])
}