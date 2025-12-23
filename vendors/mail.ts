import moment from "moment"
import pLimit from "p-limit";
import nodemailer from 'nodemailer';


function getTransport() {
    const host = process.env.NUXT_PUBLIC_SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.NUXT_PUBLIC_SMTP_PORT || '587');
    const user = process.env.NUXT_PUBLIC_SMTP_USER;
    const pass = process.env.NUXT_PUBLIC_SMTP_PASSWORD;

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

    return transport.sendMail({
        from: from || process.env.NUXT_PUBLIC_SMTP_FROM || `Trecurity <${process.env.NUXT_PUBLIC_SMTP_USER}>`,
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