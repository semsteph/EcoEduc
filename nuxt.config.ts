import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// URL publique du backend Express (Railway en prod, localhost en dev).
// À définir sur Netlify : Site settings > Environment variables > API_BACKEND_URL.
const backendUrl = process.env.API_BACKEND_URL || 'http://localhost:8080'

export default defineNuxtConfig({

  devtools: { enabled: true },

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
        { name: 'theme-color', content: '#1976d2' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'EchoEducation' },
      ],
      // Application installable (écran d'accueil) : nécessaire aux
      // notifications sur iPhone, utile partout.
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/icones/apple-touch-icon.png' },
      ],
    },
  },

css: [
    '@/assets/css/styles.css', // ➕ Ajout de ton fichier Tailwind CSS
    // Interface fine sur toutes les pages (champs, boutons, conteneurs ;
    // champs deux par ligne sur téléphone).
    '@/assets/css/interface-fine.css',
  ],
  

  build: {
    transpile: ['vuetify'],
  },

  modules: [
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        // @ts-expect-error
        config.plugins.push(vuetify({ autoImport: true }))
      })
    },
  ],

  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  },
 
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY, // Clé OpenAI (uniquement côté serveur)
    public: {
      baseURL: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3002', // Base URL exposée côté client
    },
  },

  // Déploiement sur Netlify (SSR classique via Netlify Functions).
  nitro: {
    preset: 'netlify',
  },

  // Proxy /api et /uploads vers le backend Express — géré par Nitro lui-même
  // (contrairement aux redirects netlify.toml, ça fonctionne de façon fiable
  // même quand le preset Netlify génère son propre catch-all SSR).
  routeRules: {
    '/api/**': { proxy: `${backendUrl}/api/**` },
    '/uploads/**': { proxy: `${backendUrl}/uploads/**` },
  },

  compatibilityDate: '2024-07-08',

})
