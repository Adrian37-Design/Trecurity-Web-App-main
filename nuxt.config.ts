// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineNuxtConfig({
  typescript: {
    strict: false
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' }
  },

  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    name: 'Trecurity',
    description: 'Trecurity is a vehicle tracking system.',
    defaultLocale: 'en',
  },

  css: [
    'primevue/resources/themes/aura-light-green/theme.css',
    'primevue/resources/primevue.css',
    'primeicons/primeicons.css'
  ],

  build: {
    transpile: [
      'primevue',
      'xlsx'
    ]
  },

  nitro: {
    externals: {
      inline: ['xlsx']
    }
  },

  modules: ['@pinia/nuxt', /* 'nuxt-purgecss', */ /* '@nuxtjs/seo', */ 'nuxt-security', '@nuxt/image', /*'@sentry/nuxt/module' */],

  security: {
    headers: {
      contentSecurityPolicy: {
        'script-src': [
          "'self'",
          "'unsafe-inline' https://*.google.com https://www.gstatic.com https://storage.googleapis.com https://*.paypal.com https://www.googletagmanager.com https://www.google-analytics.com https://www.pagespeed-mod.com"
        ],
        'script-src-attr': [
          "'self'",
          "'unsafe-inline'"
        ],
        'img-src': [
          "'self'",
          "data:",
          "https://*.openstreetmap.org",
          "https://*.tile.openstreetmap.org",
          "https://*.basemaps.cartocdn.com",
          "https://*.tile.openstreetmap.fr"
        ],
        'connect-src': [
          "'self'",
          "https://*.openstreetmap.org",
          "https://*.tile.openstreetmap.org",
          "https://*.basemaps.cartocdn.com",
          "https://*.tile.openstreetmap.fr",
          "https://*.google.com",
          "https://www.google.com",
          "https://www.gstatic.com"
        ],
        'upgrade-insecure-requests': false
      },
      crossOriginEmbedderPolicy: 'unsafe-none',  // Allow loading OpenStreetMap tiles
      crossOriginOpenerPolicy: 'same-origin-allow-popups',
      xFrameOptions: false,
      strictTransportSecurity: false,
      permissionsPolicy: {
        geolocation: ["'self'"],
        camera: ["'none'"],
        microphone: ["'none'"]
      }
    },
  },

  purgecss: {
    safelist: {
      greedy: [/^nuxt-/, /^vue-/, /^p-/, /^swiper-/, /^swal2-/, /^dt-/, /^dataTables/, /^form-select/, /^form-control/, /^pagination/, /^page-item/, /^paging/, /^page-link/, /^last/, /^table/, /^sorting/, /^col-/, /^dtfc-fixed-/, /^leaflet/, /^marker-cluster/, /^fullscreen-/, /^pi-/, /^ti-/]
    }
  },

  devtools: { enabled: true },

  vite: {
    server: {
      allowedHosts: true,  // Allow Cloudflare tunnel and other tunneling services
      hmr: {
        protocol: 'wss',
        clientPort: 443
      }
    }
  },

  runtimeConfig: {
    DATABASE_URL: process.env.DATABASE_URL || 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity',
    SMTP_HOST: process.env.SMTP_HOST || 'mail.privateemail.com',
    SMTP_PORT: process.env.SMTP_PORT || '587',
    SMTP_USER: process.env.SMTP_USERNAME || 'info@trecurity.com',
    SMTP_PASSWORD: process.env.SMTP_PASSWORD || '%Gj6R8sKAdKXqeE',
    jwtAppTokenSecret: process.env.NUXT_JWT_APP_TOKEN_SECRET || 'bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318',
    jwtControllerTokenSecret: process.env.NUXT_JWT_CONTROLLER_TOKEN_SECRET || 'bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318',
    public: {
      RECAPTCHA_CLIENT_SITE_KEY: "6LfB-UMsAAAAAErpo7GNwefulO-wNmTI6HpEZ8td",
      jwtAppTokenSecret: process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET || 'bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318',
    }
  },

  // sentry: {
  //   sourceMapsUploadOptions: {
  //     org: 'xavisoft-digital',
  //     project: 'trecurity'
  //   }
  // },

  // sourcemap: {
  //   client: 'hidden'
  // }
} as any)