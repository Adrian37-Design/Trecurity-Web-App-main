import * as Sentry from "@sentry/nuxt";

Sentry.init({
  // If set up, you can use your runtime config here
  // dsn: useRuntimeConfig().public.sentry.dsn,
  dsn: "https://2c737a6ab90950c6a098f012e4e4336c@o4504122577059840.ingest.us.sentry.io/4508704066895872",
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  
  // sample rate
  sampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0.1,
});
