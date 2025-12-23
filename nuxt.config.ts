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

  modules: ['@pinia/nuxt', 'nuxt-purgecss', /* '@nuxtjs/seo', */ 'nuxt-security', '@nuxt/image', /*'@sentry/nuxt/module' */],

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
          "https://*.tile.openstreetmap.org"
        ],
        'connect-src': [
          "'self'",
          "https://*.openstreetmap.org",
          "https://*.tile.openstreetmap.org"
        ]
      },
      crossOriginEmbedderPolicy: process.env.NODE_ENV === 'development' ? 'unsafe-none' : 'require-corp',
      crossOriginOpenerPolicy: 'same-origin-allow-popups',
      xFrameOptions: false
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
    public: {
      RECAPTCHA_CLIENT_SITE_KEY: ""
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