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
    url: 'https://trecurity.com',
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
      'primevue'
    ]
  },

  modules: ['@pinia/nuxt', 'nuxt-purgecss', '@nuxtjs/seo', 'nuxt-security', '@nuxt/image', /*'@sentry/nuxt/module' */],

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
          "https://*.openstreetmap.org"
        ]
      },
      crossOriginEmbedderPolicy: 'unsafe-none',
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
})