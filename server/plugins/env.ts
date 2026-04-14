import assert from 'assert';

const list = [
   'DATABASE_URL',
   // SMTP credentials are optional - email features disabled if not set
   // 'SMTP_PASSWORD',
   // 'SMTP_USERNAME',
   'NUXT_JWT_APP_TOKEN_SECRET',
   'NUXT_JWT_CONTROLLER_TOKEN_SECRET',
   'NUXT_PUBLIC_RECAPTCHA_CLIENT_SITE_KEY',
   'NUXT_RECAPTCHA_SERVER_SITE_KEY',
   'SENTRY_AUTH_TOKEN',
];

export default defineNitroPlugin((nitroApp) => {
   // Deactivated assertions for hardcoded fallbacks
   // for (const name of list) {
   //    assert(process.env[name], `Environment variable ${name} is not set.`);
   // }
});
